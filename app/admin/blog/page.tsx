'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminBlogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const contentEditableRef = useRef<HTMLDivElement | null>(null)

  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    category: 'ATS Optimization',
    excerpt: '',
    content: '',
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      const OWNER_EMAIL = 'yaman.kashyap@gmail.com' 

      if (error || !user || user.email !== OWNER_EMAIL) {
        router.push('/')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  // Reliable H2 Header Injector for Creator page
  const insertHeading = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const h2 = document.createElement('h2')
    h2.className = 'text-xl font-bold mt-4 mb-2 text-slate-900'
    h2.textContent = selection.toString() || 'Heading'
    range.deleteContents()
    range.insertNode(h2)
    if (contentEditableRef.current) {
      setBlogForm({ ...blogForm, content: contentEditableRef.current.innerHTML })
    }
  }

  // Insert or wrap selected text with a hyperlink
  const insertLink = () => {
    const url = prompt('Enter the link URL (e.g. https://cveate.com/onboard or /ats-checker):', 'https://')
    if (!url) return
    document.execCommand('createLink', false, url)
  }

  const removeLink = () => {
    document.execCommand('unlink', false, undefined)
  }

  useEffect(() => {
    if (contentEditableRef.current && blogForm.content === '') {
      contentEditableRef.current.innerHTML = ''
    }
  }, [blogForm.content])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
    setBlogForm({ ...blogForm, title, slug })
  }

  const executeFormatting = (command: string, value: string = '') => {
    document.execCommand(command, false, value)
  }

  const handlePublishBlog = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')

    if (!blogForm.title || !blogForm.slug || !blogForm.excerpt || !blogForm.content) {
      setError('Please fill out all required fields.')
      setSubmitting(false)
      return
    }

    try {
      const { error: insertError } = await supabase
        .from('blogs')
        .insert([
          {
            title: blogForm.title,
            slug: blogForm.slug,
            category: blogForm.category,
            excerpt: blogForm.excerpt,
            content: blogForm.content,
            author: 'Yaman',
          },
        ])

      if (insertError) throw insertError

      setMessage('Blog published successfully!')
      setBlogForm({ title: '', slug: '', category: 'ATS Optimization', excerpt: '', content: '' })
      if (contentEditableRef.current) contentEditableRef.current.innerHTML = ''
    } catch (err: any) {
      setError(err.message || 'Failed to publish blog.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Verifying Admin Privileges...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Admin Blog Publisher</h1>
          </div>
          <Link href="/">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
               Back to Home
            </button>
          </Link>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">{error}</div>}
        {message && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-xs font-semibold text-green-600">{message}</div>}

        <form onSubmit={handlePublishBlog} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Blog Title *</label>
            <input
              type="text"
              value={blogForm.title}
              onChange={handleTitleChange}
              placeholder="e.g. 5 Strategies to Bypass Corporate ATS Filters in 2026"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">URL Slug *</label>
              <input
                type="text"
                value={blogForm.slug}
                onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                placeholder="e.g. bypass-corporate-ats-filters"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Category *</label>
              <select
                value={blogForm.category}
                onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white"
              >
                <option value="ATS Optimization">ATS Optimization</option>
                <option value="Resume Writing">Resume Writing</option>
                <option value="Job Search">Job Search</option>
                <option value="Career Growth">Career Growth</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Short Excerpt *</label>
            <textarea
              rows={2}
              value={blogForm.excerpt}
              onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
              placeholder="Brief summary for preview cards and SEO meta description..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Full Content *</label>
              
              {/* Visible Rich Text Toolbar */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeFormatting('bold')}
                  title="Bold"
                  className="px-3 py-1 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded shadow-xs cursor-pointer"
                >
                  B
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeFormatting('italic')}
                  title="Italic"
                  className="px-3 py-1 text-xs italic font-serif bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded shadow-xs cursor-pointer"
                >
                  I
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeFormatting('insertUnorderedList')}
                  title="Bullet List"
                  className="px-3 py-1 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded shadow-xs cursor-pointer"
                >
                  • List
                </button>
                <button
  type="button"
  onMouseDown={(e) => e.preventDefault()}
  onClick={insertHeading}
  title="Heading 2"
  className="px-3 py-1 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded shadow-xs cursor-pointer"
>
  H2
</button>
<button
  type="button"
  onMouseDown={(e) => e.preventDefault()}
  onClick={insertLink}
  title="Insert Link"
  className="px-3 py-1 text-xs font-bold bg-white border border-slate-200 text-indigo-600 hover:bg-slate-50 rounded shadow-xs cursor-pointer"
>
  🔗 Link
</button>
<button
  type="button"
  onMouseDown={(e) => e.preventDefault()}
  onClick={removeLink}
  title="Remove Link"
  className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 text-red-600 hover:bg-slate-50 rounded shadow-xs cursor-pointer"
>
  Unlink
</button>
              </div>
            </div>

            {/* ContentEditable Rich Text Box */}
            <div
              ref={contentEditableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setBlogForm({ ...blogForm, content: e.currentTarget.innerHTML })}
              className="w-full min-h-[260px] rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white overflow-y-auto"
              style={{ whiteSpace: 'pre-wrap' }}
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Publishing...' : 'Publish Blog Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}