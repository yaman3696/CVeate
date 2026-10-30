const strings = { type: 'array', items: { type: 'string' } }
const stringObject = (fields: string[]) => ({ type: 'object', properties: Object.fromEntries(fields.map(k => [k, { type: 'string' }])), required: fields, additionalProperties: false })
const profileFields = ['fullName','headline','email','phone','city','state','pincode','linkedin','portfolio','bio','technicalSkills','softSkills','hobbies','languages']
export const ATS_REPORT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    matchScore: { type: 'number', minimum: 0, maximum: 100 },
    missingKeywords: strings, strengths: strings, weaknesses: strings, suggestions: strings,
    extractedProfile: { type: 'object', additionalProperties: false, properties: {
      ...Object.fromEntries(profileFields.map(k => [k, { type: 'string' }])),
      experiences: { type: 'array', items: stringObject(['role','company','duration','bullets']) },
      qualifications: { type: 'array', items: stringObject(['degree','institution','year']) },
    }, required: [...profileFields,'experiences','qualifications'] },
  }, required: ['matchScore','missingKeywords','strengths','weaknesses','suggestions','extractedProfile'],
}
