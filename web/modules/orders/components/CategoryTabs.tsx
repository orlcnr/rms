'use client'

type CategoryTab = {
  id: string
  name: string
}

interface CategoryTabsProps {
  categories: CategoryTab[]
  activeCategoryId: string
  onCategoryChange: (categoryId: string) => void
}

export function CategoryTabs({
  categories,
  activeCategoryId,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <div className="mb-4 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border-medium">
      <div className="flex min-w-max items-center gap-2">
        <button
          type="button"
          onClick={() => onCategoryChange('__all__')}
          className={`min-h-11 rounded-sm border px-4 text-[11px] font-black uppercase tracking-[0.14em] transition-transform active:scale-[0.97] ${
            activeCategoryId === '__all__'
              ? 'border-primary-main bg-primary-main text-white'
              : 'border-border-light bg-bg-app text-text-muted'
          }`}
        >
          Tümü
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={`min-h-11 rounded-sm border px-4 text-[11px] font-black uppercase tracking-[0.14em] transition-transform active:scale-[0.97] ${
              activeCategoryId === category.id
                ? 'border-primary-main bg-primary-main text-white'
                : 'border-border-light bg-bg-app text-text-muted'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}
