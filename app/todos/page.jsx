'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'

export default function Page() {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    async function getTodos() {
      const { data: data, error } = await supabase.from('todos').select()

      if (error) {
        console.error('Error fetching todos:', error)
      } else if (data) {
        setTodos(data)
      }
    }

    getTodos()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Supabase Todos</h1>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
      {todos.length === 0 && <p>No todos found. Ensure your Supabase 'todos' table has data.</p>}
    </div>
  )
}
