'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Member } from '@/types'

interface Props { members: Member[]; myMemberId: string | null }

export function MemberGrid({ members, myMemberId }: Props) {
  const slots = Array.from({ length: 10 }, (_, i) => members[i] || null)

  return (
    <div className="grid grid-cols-5 gap-3">
      {slots.map((member, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}>
          {member ? (
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden border-2 relative"
                style={{ borderColor: member.id === myMemberId ? '#ff6eb4' : '#fce7f3', background: '#fff0f7' }}>
                {member.photo_url ? (
                  <Image src={member.photo_url} alt={member.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                )}
                {/* Status dot */}
                <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full border border-white"
                  style={{ background: member.photo_url ? '#6ee7b7' : '#fbbf24' }} />
              </div>
              {member.id === myMemberId && (
                <div className="absolute -bottom-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#ff6eb4', fontSize: '0.6rem' }}>YOU</div>
              )}
              <p className="text-center text-xs font-bold mt-1.5 truncate" style={{ color: '#3d2a4e' }}>{member.name}</p>
            </div>
          ) : (
            <div className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center text-xl" style={{ borderColor: '#fce7f3', background: '#fafafa', opacity: 0.5 }}>
              👤
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
