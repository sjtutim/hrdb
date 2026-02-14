'use client';

import { useState } from 'react';
import { Check, Plus, Calendar } from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface TodoListProps {
  initialTodos?: Todo[];
}

const priorityColors = {
  high: 'text-red-400 border-red-400/50',
  medium: 'text-amber-400 border-amber-400/50',
  low: 'text-slate-400 border-slate-400/50',
};

export function TodoList({ initialTodos = [] }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos.length > 0 ? initialTodos : [
    { id: '1', title: '审核本周新投递的简历', completed: false, dueDate: '今天', priority: 'high' },
    { id: '2', title: '安排产品经理岗位面试', completed: false, dueDate: '明天', priority: 'high' },
    { id: '3', title: '完成试用期员工评估报告', completed: true, dueDate: '2月28日', priority: 'medium' },
    { id: '4', title: '更新前端工程师岗位要求', completed: false, dueDate: '3月1日', priority: 'low' },
    { id: '5', title: '准备季度人才分析报告', completed: false, dueDate: '3月5日', priority: 'medium' },
  ]);
  const [newTodo, setNewTodo] = useState('');

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, {
        id: Date.now().toString(),
        title: newTodo,
        completed: false,
        dueDate: '今天',
        priority: 'medium',
      }]);
      setNewTodo('');
    }
  };

  const completedCount = todos.filter(t => t.completed).length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  return (
    <div className="bento-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">待办事项</h3>
          <p className="text-sm text-slate-400 mt-0.5">{completedCount}/{todos.length} 已完成</p>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-slate-700 flex items-center justify-center">
          <span className="text-xs font-medium text-slate-300">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-1 bg-slate-800 rounded-full mb-4 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 任务列表 */}
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide max-h-[280px]">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className={`group flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${
              todo.completed 
                ? 'bg-slate-800/30' 
                : 'bg-slate-800/50 hover:bg-slate-800/70'
            }`}
          >
            <button
              onClick={() => toggleTodo(todo.id)}
              className={`notion-checkbox mt-0.5 flex-shrink-0 ${todo.completed ? 'checked' : ''}`}
            >
              {todo.completed && <Check className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm transition-all duration-200 ${
                todo.completed 
                  ? 'text-slate-500 line-through' 
                  : 'text-slate-200'
              }`}>
                {todo.title}
              </p>
              {todo.dueDate && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-500">{todo.dueDate}</span>
                  {todo.priority && !todo.completed && (
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityColors[todo.priority]}`}>
                      {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 添加新任务 */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="添加新任务..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            onClick={addTodo}
            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
