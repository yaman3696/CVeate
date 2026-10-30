export const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'] as const
export const SENIORITIES=['Internship','Entry level','Mid level','Senior','Lead','Manager','Director'] as const
export const WORK_MODES=['On-site','Hybrid','Remote'] as const
export const EMPLOYMENT_TYPES=['Full-time','Part-time','Contract','Internship'] as const
export type Organization={id:string;name:string;website:string;status:'pending_verification'|'verified'|'suspended';created_at:string}
export type Job={version:number;id:string;organization_id:string;title:string;description:string;state:string;city:string;seniority:string;work_mode:string;employment_type:string;salary_min:number|null;salary_max:number|null;experience_min:number;skills:string[];status:'draft'|'published'|'paused'|'closed';deadline:string|null;created_at:string;organizations?:{name:string;website:string}}
export const JOB_FIELDS='version,id,organization_id,title,description,state,city,seniority,work_mode,employment_type,salary_min,salary_max,experience_min,skills,status,deadline,created_at'
export function validateJob(value:unknown){
 if(!value||typeof value!=='object')throw Error('Invalid job.');const v=value as Record<string,unknown>
 const text=(k:string,max:number,required=false)=>{if(typeof v[k]!=='string'||(v[k] as string).length>max||(required&&!(v[k] as string).trim())||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v[k] as string))throw Error(`Check ${k}.`);return (v[k] as string).trim()}
 const title=text('title',150,true),description=text('description',15000,true),state=text('state',80,true),city=text('city',100),seniority=text('seniority',30,true),work_mode=text('work_mode',20,true),employment_type=text('employment_type',20,true)
 if(!(INDIAN_STATES as readonly string[]).includes(state)||!(SENIORITIES as readonly string[]).includes(seniority)||!(WORK_MODES as readonly string[]).includes(work_mode)||!(EMPLOYMENT_TYPES as readonly string[]).includes(employment_type))throw Error('Choose valid location and job filters.')
 const salary=(k:string)=>{const n=v[k];if(n===null||n==='')return null;if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||n>1000000000)throw Error('Use annual salary in whole INR.');return n}
 const salary_min=salary('salary_min'),salary_max=salary('salary_max');if(salary_min!==null&&salary_max!==null&&salary_min>salary_max)throw Error('Maximum salary must be at least minimum salary.')
 if(!Number.isInteger(v.experience_min)||Number(v.experience_min)<0||Number(v.experience_min)>50)throw Error('Experience must be between 0 and 50 years.')
 if(!Array.isArray(v.skills)||v.skills.length>20||!v.skills.every(s=>typeof s==='string'&&s.trim().length>0&&s.length<=60))throw Error('Add up to 20 skills.')
 const deadline=v.deadline===null||v.deadline===''?null:text('deadline',10)
 if(deadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(deadline)||!Number.isFinite(Date.parse(deadline))||new Date(deadline).toISOString().slice(0,10)!==deadline))throw Error('Choose a valid application deadline.')
 return {title,description,state,city,seniority,work_mode,employment_type,salary_min,salary_max,experience_min:Number(v.experience_min),skills:[...new Set((v.skills as string[]).map(s=>s.trim()))],deadline}
}
export function salaryLabel(job:Pick<Job,'salary_min'|'salary_max'>){const money=(n:number)=>`₹${new Intl.NumberFormat('en-IN',{maximumFractionDigits:1}).format(n/100000)} lakh`;return job.salary_min!==null&&job.salary_max!==null?`${money(job.salary_min)} – ${money(job.salary_max)} / year`:job.salary_min!==null?`From ${money(job.salary_min)} / year`:job.salary_max!==null?`Up to ${money(job.salary_max)} / year`:'Salary not disclosed'}
