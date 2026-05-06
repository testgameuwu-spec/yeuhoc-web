fetch('https://yeuhoc-web.vercel.app/profile/')
  .then(r=>r.text())
  .then(html=>{ 
    const jsChunks = html.match(/\/_next\/static\/chunks\/[^\"]+\.js/g); 
    if(jsChunks) { 
      Promise.all(jsChunks.map(chunk=>fetch('https://yeuhoc-web.vercel.app'+chunk).then(r=>r.text())))
      .then(texts => { 
        console.log('Found Local DB URL (ahcgigcacmaerammxzqe):', texts.some(t => t.includes('ahcgigcacmaerammxzqe'))); 
      }) 
    } 
  })
