
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ExportExcelButton from '@/components/admin/ExportExcelButton'
import type { ExcelSheet } from '@/lib/exports/excel'

type BlogStatus = 'published' | 'draft' | 'archived'

type Blog = {
  id: string
  title: string
  slug: string
  category: string
  excerpt: string
  author: string
  status: BlogStatus
  created_at: string
  updated_at: string | null
  published_at: string | null
  meta_title: string | null
  meta_description: string | null
  focus_keyword: string | null
}

export default function BlogManagementPage() {
  const router = useRouter()

  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  
const loadBlogs = useCallback(async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const response = await fetch('/api/admin/blogs', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: 'no-store',
  })

  const result = await response.json()

  if (!response.ok) {
    if (result.error === 'MFA_REQUIRED') {
      router.replace('/admin/mfa')
      return
    }

    if (result.error === 'ADMIN_REQUIRED') {
      router.replace('/')
      return
    }

    throw new Error(result.error || 'Unable to load articles.')
  }

  setBlogs((result.blogs ?? []) as Blog[])
}, [router])


const handleDeleteBlog = async (blog: Blog) => {
  const confirmed = window.confirm(
    `Permanently delete "${blog.title}"?\n\nThis action cannot be undone.`
  )

  if (!confirmed || deletingId) return

  setDeletingId(blog.id)
  setError('')

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.replace('/')
      return
    }

    const response = await fetch(
      `/api/admin/blogs/${blog.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      }
    )

    const result = await response.json()

    if (!response.ok) {
      if (result.error === 'MFA_REQUIRED') {
        router.replace('/admin/mfa')
        return
      }

      if (result.error === 'ADMIN_REQUIRED') {
        router.replace('/')
        return
      }

      throw new Error(
        result.error || 'Unable to delete article.'
      )
    }

    setBlogs(current =>
      current.filter(item => item.id !== blog.id)
    )
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Unable to delete article.'
    )
  } finally {
    setDeletingId(null)
  }
}


  


  useEffect(() => {
    let active = true

    const initialize = async () => {
      try {
        const { data: sessionData } =
          await supabase.auth.getSession()

        const token = sessionData.session?.access_token

        if (!token) {
          router.replace('/')
          return
        }

        const response = await fetch('/api/admin/access', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          router.replace('/')
          return
        }

        const access = await response.json()

        if (!access.authorized) {
          router.replace('/')
          return
        }

        if (!access.mfaVerified) {
          router.replace('/admin/mfa')
          return
        }

        if (active) await loadBlogs()
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load articles.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void initialize()

    return () => {
      active = false
    }
  }, [router, loadBlogs])

  const categories = useMemo(
    () => [...new Set(blogs.map(blog => blog.category))]
      .sort(),
    [blogs]
  )

  const filteredBlogs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return blogs.filter(blog => {
      const matchesSearch =
        !query ||
        blog.title.toLowerCase().includes(query) ||
        blog.slug.toLowerCase().includes(query) ||
        blog.category.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        blog.status === statusFilter

      const matchesCategory =
        categoryFilter === 'all' ||
        blog.category === categoryFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      )
    })
  }, [blogs, search, statusFilter, categoryFilter])

  const publishedCount = blogs.filter(
    blog => blog.status === 'published'
  ).length

  const draftCount = blogs.filter(
    blog => blog.status === 'draft'
  ).length

  const archivedCount = blogs.filter(
    blog => blog.status === 'archived'
  ).length

  const getExcelSheets = async (): Promise<ExcelSheet[]> => [
    {
      name: 'Blog Articles',
      headers: [
        'Title',
        'Slug',
        'Category',
        'Status',
        'Author',
        'Created At',
        'Updated At',
        'Published At',
        'Meta Title',
        'Meta Description',
        'Focus Keyword',
      ],
      rows: filteredBlogs.map(blog => [
        blog.title,
        blog.slug,
        blog.category,
        blog.status,
        blog.author,
        blog.created_at,
        blog.updated_at ?? '',
        blog.published_at ?? '',
        blog.meta_title ?? '',
        blog.meta_description ?? '',
        blog.focus_keyword ?? '',
      ]),
    },
  ]

  const formatDate = (value: string | null) => {
    if (!value) return '—'

    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-600">
        Verifying admin access and loading articles...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-sm text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            Blog Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your articles, publishing workflow and SEO.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportExcelButton
            sheets={getExcelSheets}
            fileName={`CVeat_Blogs_${new Date()
              .toISOString()
              .slice(0, 10)}.xlsx`}
          />

          <Link
            href="/admin/blog/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Create Blog
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Articles', value: blogs.length },
          { label: 'Published', value: publishedCount },
          { label: 'Drafts', value: draftCount },
          { label: 'Archived', value: archivedCount },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-bold">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search title, slug or category..."
            className="min-w-52 flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          />

          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Article</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredBlogs.map(blog => (
                <tr key={blog.id} className="hover:bg-slate-50">
                  <td className="max-w-sm px-5 py-4">
                    <p className="font-semibold">
                      {blog.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                    /articles/{blog.slug}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    {blog.category}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        blog.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : blog.status === 'draft'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {blog.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {formatDate(blog.created_at)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/blog/edit/${blog.id}`}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        Edit
                      </Link>

                      {blog.status === 'published' && (
                        <Link
                        href={`/articles/${blog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:underline"
                      >
                        View
                      </Link>
                      )}
                      <button
  type="button"
  disabled={deletingId !== null}
  onClick={() => void handleDeleteBlog(blog)}
  className="font-semibold text-red-600 hover:text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
>
  {deletingId === blog.id ? 'Deleting...' : 'Delete'}
</button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredBlogs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No matching articles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {filteredBlogs.length} of {blogs.length} articles
        </div>
      </div>
    </div>
  )
}
