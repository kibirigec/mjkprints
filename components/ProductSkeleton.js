export default function ProductSkeleton() {
  return (
    <div className="group cursor-pointer">
      <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 animate-pulse">
        {/* Image skeleton */}
        <div className="relative aspect-square bg-gray-200 rounded-xl mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-3">
          {/* Title */}
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          
          {/* Description */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
          
          {/* Price and badge */}
          <div className="flex items-center justify-between pt-2">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
          </div>

          {/* Artist info */}
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  )
}