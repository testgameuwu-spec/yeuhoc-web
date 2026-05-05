import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    // Lấy tất cả giao dịch chưa có user_id
    const { data: transactions, error: fetchError } = await supabaseAdmin
      .from('sepay_transactions')
      .select('id, content')
      .is('user_id', null);

    if (fetchError) {
      return NextResponse.json({ success: false, message: fetchError.message }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ success: true, updated: 0, message: 'Không có giao dịch nào cần xử lý.' });
    }

    let updatedCount = 0;

    for (const tx of transactions) {
      if (!tx.content) continue;

      const upperContent = tx.content.toUpperCase().replace(/\s+/g, ' ').trim();
      let userId = null;

      // Tìm pattern TKPYH1 hoặc YEUHOC
      const match = upperContent.match(/(?:YEUHOC|TKPYH1)\s+([A-Z0-9_.@-]+)/i);
      if (match && match[1]) {
        const identifier = match[1].toLowerCase().trim();

        // Tìm theo email prefix
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .ilike('email', `${identifier}@%`);

        if (profiles && profiles.length === 1) {
          userId = profiles[0].id;
        } else if (profiles && profiles.length > 1) {
          const exact = profiles.find(p => p.email.split('@')[0].toLowerCase() === identifier);
          if (exact) userId = exact.id;
        }

        if (!userId) {
          // Tìm theo UUID prefix
          const { data: idProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .ilike('id', `${identifier}%`);
          if (idProfiles && idProfiles.length === 1) {
            userId = idProfiles[0].id;
          }
        }
      }

      // Fallback: quét từng từ trong nội dung
      if (!userId) {
        const words = upperContent.split(/[\s.,-]+/).filter(w => w.length >= 4 && /^[A-Z0-9_]+$/i.test(w));
        for (const word of words) {
          if (['YEUHOC', 'TKPYH1', 'UNGHO', 'TPBANK', 'MBBANK', 'VIETCOMBANK', 'TECHCOMBANK'].includes(word)) continue;
          const { data: fp } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .ilike('email', `${word.toLowerCase()}@%`);
          if (fp && fp.length === 1) {
            userId = fp[0].id;
            break;
          }
        }
      }

      if (userId) {
        await supabaseAdmin
          .from('sepay_transactions')
          .update({ user_id: userId })
          .eq('id', tx.id);
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updated: updatedCount, total: transactions.length });
  } catch (error) {
    console.error('Re-identify error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
