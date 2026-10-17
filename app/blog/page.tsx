'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
export default function BlogPage() {
const [blogs, setBlogs] = useState<any[]>([])
const [searchQuery, setSearchQuery] = useState('')
const [loading, setLoading] = useState(true)
// Fetch blogs dynamically from Supabase on load
useEffect(() => {
const fetchBlogs = async () => {
const { data, error } = await supabase
.from('blogs')
.select('*')
.order('created_at', { ascending: false })
if (data) {
setBlogs(data)
}
setLoading(false)
}
fetchBlogs()
}, [])
// Filter blogs based on search query
const filteredBlogs = blogs.filter(blog =>
blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
blog.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
)
return (
<div className="min-h-screen bg-white text-slate-900 py-16 px-6">
<div className="mx-auto max-w-6xl space-y-12">
{/* Header & Search Bar */}
<div className="text-center space-y-4 max-w-2xl mx-auto">
<div className="flex items-center justify-center gap-2">
<Link href="/" className="text-xs font-bold text-indigo-600
hover:underline">← Back to Home</Link>
</div>
<h1 className="text-4xl font-extrabold tracking-tight text-slate-900
sm:text-5xl">
Career Advice & <span className="text-indigo-600">ATS Strategies</span>
</h1>
<p className="text-sm text-slate-600">
Expert guides and actionable tips to optimize your resume, beat
recruiter filters, and accelerate your career.
</p>
{/* Search Bar */}
<div className="pt-4">
<input
type="text"
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
placeholder="Search trending topics (e.g. ATS, Design, Resume)..."
className="w-full max-w-lg rounded-2xl border border-slate-200 px-5
py-3.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2
focus:ring-indigo-600 transition-all bg-slate-50/50"
/>
</div>
</div>
{/* Blog Cards Grid */}
{loading ? (
<div className="text-center py-20 text-slate-400 text-sm">Loading
articles...</div>
) : (
<div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
{filteredBlogs.length > 0 ? (
filteredBlogs.map((blog) => (
<article
key={blog.id}
className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/80"
>
<div>
<div className="flex items-center justify-between mb-3">
<span className="rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 transition-colors duration-300 group-hover:border-indigo-200 group-hover:bg-indigo-100">
{blog.category}
</span>
<span className="text-[11px] text-slate-400 font-medium">By
{blog.author}</span>
</div>
<h3 className="mt-2 mb-2 text-base font-bold text-slate-900 transition-colors duration-300 group-hover:text-indigo-700">
{blog.title}
</h3>
<p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
{blog.excerpt}
</p>
</div>
<div className="mt-6 pt-4 border-t border-slate-100 flex items-center
justify-between text-xs">
<span className="text-slate-400">{new
Date(blog.created_at).toLocaleDateString()}</span>
<Link href={`/articles/${blog.slug}`}>
<span className="inline-block font-bold text-indigo-600 transition-transform duration-300 group-hover:translate-x-1 hover:text-indigo-700">Read Article →</span>
</Link>
</div>
</article>
))
) : (
<div className="col-span-3 text-center py-16 text-slate-400 text-sm
bg-slate-50 rounded-3xl border border-slate-200">
{blogs.length === 0 ? (
<div>
<p className="font-bold text-slate-800">No blog posts published yet.</p>
</div>
) : (
`No articles found matching "${searchQuery}". Try searching for
something else!`
)}
</div>
)}
</div>
)}
</div>
</div>
)
}
