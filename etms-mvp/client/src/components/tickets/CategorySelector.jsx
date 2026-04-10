import { CATEGORY_ICONS } from '../../constants/TICKET_TYPES'

export default function CategorySelector({ categories, selectedCategoryId, onSelect }) {
  if (!categories || categories.length === 0) {
    return <p className="text-sm text-gray-400">No categories available.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {categories.map(category => {
        const isSelected = selectedCategoryId === category.id
        const icon       = CATEGORY_ICONS[category.category_key] || '📁'

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category)}
            className={`flex flex-col items-center justify-center gap-1 p-4 rounded-xl border-2 text-center transition-all
              ${isSelected
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-gray-700 leading-tight">{category.name}</span>
          </button>
        )
      })}
    </div>
  )
}
