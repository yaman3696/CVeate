
import 'server-only'
import sanitizeHtml from 'sanitize-html'

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'div',
      'span',
      'h2',
      'h3',
      'h4',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
    ],

    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
    },

    allowedSchemes: ['http', 'https', 'mailto'],

    allowedSchemesAppliedToAttributes: ['href'],

    allowProtocolRelative: false,

    transformTags: {
      a: (_tagName, attribs) => {
        const href = attribs.href ?? ''

        return {
          tagName: 'a',
          attribs: {
            ...(href ? { href } : {}),
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(attribs.target === '_blank'
              ? {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }
              : {}),
          },
        }
      },
    },

    disallowedTagsMode: 'discard',
  })
}
