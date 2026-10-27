import { sql } from 'drizzle-orm'
import { ROLE_CODES } from '../domain/identity.js'
import { db, pool } from './client.js'
import { planEntitlements, plans, roles } from './schema/index.js'

for (const code of ROLE_CODES) {
  await db.insert(roles).values({ code }).onConflictDoNothing({ target: roles.code })
}

const planSeed = [
  { code: 'BASIC' as const, name: 'Básico', priceMonthly: '29.00', photos: 10, menus: 3, uploadMb: 8 },
  { code: 'PRO' as const, name: 'PRO', priceMonthly: '129.00', photos: 20, menus: 10, uploadMb: 15 },
]

for (const plan of planSeed) {
  await db
    .insert(plans)
    .values({
      code: plan.code,
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      currency: 'MXN',
      active: true,
    })
    .onConflictDoNothing({ target: plans.code })

  const [stored] = await db.select().from(plans).where(sql`${plans.code} = ${plan.code}`).limit(1)
  if (!stored) {
    continue
  }
  for (const [featureCode, limitValue] of [
    ['max_photos', plan.photos],
    ['max_visual_menus', plan.menus],
    ['max_upload_mb', plan.uploadMb],
  ] as const) {
    await db
      .insert(planEntitlements)
      .values({ planId: stored.id, featureCode, limitValue })
      .onConflictDoNothing()
  }
}

await pool.query(
  `INSERT INTO coverage_zones (name, status, geom)
   SELECT 'Piloto demostración', 'pilot', ST_Multi(ST_MakeEnvelope(-99.20, 19.35, -99.05, 19.50, 4326))
   WHERE NOT EXISTS (SELECT 1 FROM coverage_zones WHERE name = 'Piloto demostración')`,
)

await pool.end()
