import type { Metadata } from 'next'
import EnterpriseClient from './EnterpriseClient'
export const metadata:Metadata={title:'Enterprise hiring workspace',description:'Create your company workspace and manage jobs on CVeat Enterprise.'}
export default function Page(){return <EnterpriseClient/>}
