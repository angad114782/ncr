import { Link } from 'react-router-dom'
import { BadgeCheck, Clock, IndianRupee, MessageSquare } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

const statusColor = {
  Pending: 'text-[var(--color-warning)]',
  Responded: 'text-[var(--color-success)]',
}

export default function MyInquiries() {
  const { user } = useAuth()
  const { inquiries, properties } = useData()
  const myInquiries = inquiries.filter((i) => i.userId === user?.id)

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">My Inquiries</h1>
      {myInquiries.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center text-secondary">
          You haven't sent any inquiries yet. Visit a <Link to="/listings" className="text-[var(--color-accent)] font-medium">property page</Link> to get started.
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-4">
          {myInquiries.map((inq) => {
            const property = properties.find((p) => p.id === inq.propertyId)
            return (
              <GlassCard hover={false} key={inq.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {property && (
                  <img src={property.images[0]} alt={property.title} className="w-full sm:w-28 h-20 rounded-[14px] object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <Link to={`/property/${inq.propertyId}`} className="font-semibold hover:text-[var(--color-accent)] truncate block flex items-center gap-1.5">
                    {property?.title ?? 'Property removed'}
                    {inq.phoneVerified && (
                      <span className="text-[var(--color-success)] shrink-0" title="Phone verified via OTP">
                        <BadgeCheck size={13} />
                      </span>
                    )}
                  </Link>
                  {inq.budget && (
                    <p className="text-secondary text-xs mt-0.5 flex items-center gap-1">
                      <IndianRupee size={11} /> Budget: {inq.budget}
                    </p>
                  )}
                  <p className="text-secondary text-sm flex items-center gap-1 mt-1">
                    <MessageSquare size={13} /> {inq.message}
                  </p>
                  <p className="text-tertiary text-xs flex items-center gap-1 mt-1">
                    <Clock size={12} /> {inq.date}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full glass-weak ${statusColor[inq.status]}`}>
                  {inq.status}
                </span>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
