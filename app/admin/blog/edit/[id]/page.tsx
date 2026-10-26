import EditBlogClient from './EditBlogClient'

// Admin content waits for role, MFA and permission checks.
export const instant = false

export default function Page() {
  return <EditBlogClient />
}
