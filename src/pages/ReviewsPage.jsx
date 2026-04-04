import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import UserRating from '../components/UserRating'

export default function ReviewsPage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { getUserByUsername, reviews, getUserById, orders } = useApp()

  const user = getUserByUsername(username)

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-4xl">👤</p>
        <p className="font-semibold text-sib-text">User not found</p>
        <button onClick={() => navigate(-1)} className="text-sib-primary text-sm font-medium">Go back</button>
      </div>
    )
  }

  const userReviews = reviews.filter(r => r.revieweeId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const avgRating = userReviews.length > 0
    ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
    : 0

  // Distribution of ratings
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: userReviews.filter(r => r.rating === star).length,
  }))
  const maxCount = Math.max(...distribution.map(d => d.count), 1)

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-sib-stone">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-sib-sand flex items-center justify-center">
          <ArrowLeft size={18} className="text-sib-text" />
        </button>
        <h1 className="text-base font-bold text-sib-text">Reviews</h1>
      </div>

      <div className="px-4 py-5 space-y-5 lg:max-w-2xl lg:mx-auto">
        {/* Seller summary */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-sib-sand">
          <UserAvatar user={user} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-sib-text">@{user.username}</p>
            <div className="mt-1">
              <UserRating rating={avgRating} reviewCount={userReviews.length} size="md" />
            </div>
          </div>
        </div>

        {/* Rating distribution */}
        {userReviews.length > 0 && (
          <div className="space-y-1.5">
            {distribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-sib-muted w-3 text-right">{star}</span>
                <Star size={11} className="text-sib-primary fill-sib-primary flex-shrink-0" />
                <div className="flex-1 h-2 bg-sib-sand rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sib-primary rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-sib-muted w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reviews list */}
        {userReviews.length === 0 ? (
          <div className="text-center py-12">
            <Star size={32} className="mx-auto text-sib-stone mb-2" />
            <p className="font-semibold text-sib-text">No reviews yet</p>
            <p className="text-sm text-sib-muted mt-1">This seller has no reviews.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-sib-text uppercase tracking-wide">
              All Reviews ({userReviews.length})
            </p>
            {userReviews.map(review => {
              const reviewer = getUserById(review.reviewerId)
              const order = orders.find(o => o.id === review.orderId)
              const isVerified = !!order
              return (
                <div key={review.id} className="p-4 rounded-2xl border border-sib-stone">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={reviewer} size="xs" />
                      <div>
                        <p className="text-xs font-semibold text-sib-text">@{reviewer?.username || 'user'}</p>
                        <p className="text-[10px] text-sib-muted">
                          {new Date(review.createdAt).toLocaleDateString('en-MT', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          size={12}
                          className={i <= review.rating ? 'text-sib-primary fill-sib-primary' : 'text-sib-stone'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-sib-text leading-relaxed">{review.comment}</p>
                  {isVerified && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <ShieldCheck size={12} className="text-green-600" />
                      <span className="text-[10px] text-green-700 font-semibold">Verified Purchase</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
