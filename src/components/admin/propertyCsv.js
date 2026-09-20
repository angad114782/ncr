import { buildPropertyTemplateCsv, parsePropertyCsv, propertiesToCsv } from '../../utils/csv'
import { isDataUrl } from '../../utils/images'
import { newId } from '../../utils/ids'

// CSV carries image LINKS only. When a CSV row updates an existing listing, images that
// were uploaded in the admin (which a CSV can't hold) are kept instead of being wiped.
const keepUploads = (list = [], prev = []) => [...list, ...prev.filter(isDataUrl)]

export const propertyCsv = {
  entity: 'listings',
  filename: 'properties',
  keyHelp: 'Rows whose id matches an existing listing update it; others are added. Images / floorPlans are links separated by ";". nearby = Type:Name:Distance;… (uploaded images can’t be exported).',
  toCsv: propertiesToCsv,
  template: (seed) => buildPropertyTemplateCsv(seed.find((p) => p.id === 'p1'), seed.find((p) => p.id === 'p2')),
  parse(text, existing) {
    const { properties, errors } = parsePropertyCsv(text)
    const byId = new Map(existing.map((p) => [p.id, p]))
    const items = properties.map((p) => {
      const prev = p.id ? byId.get(p.id) : undefined
      return {
        ...(prev ?? {}),
        ...p,
        id: prev?.id ?? newId('p'),
        images: keepUploads(p.images, prev?.images),
        floorPlans: keepUploads(p.floorPlans, prev?.floorPlans),
      }
    })
    return { items, errors }
  },
}
