'use client'

import { Modal } from '@/modules/shared/components/Modal'
import {
    Ingredient,
    INVENTORY_LABELS,
    MovementType,
} from '../../types'
import { IngredientForm } from '../IngredientForm'
import { StockMovementForm } from '../StockMovementForm'

interface InventoryModalsProps {
    isIngredientModalOpen: boolean
    isMovementModalOpen: boolean
    selectedIngredient: Ingredient | null
    activeMovementType: MovementType
    isSubmitting: boolean
    onCloseIngredientModal: () => void
    onCloseMovementModal: () => void
    onSubmitIngredient: (data: Partial<Ingredient>) => Promise<void>
    onSubmitMovement: (data: {
        ingredient_id: string
        quantity: number
        reason: string
        type: MovementType
        unit_price?: number
    }) => Promise<void>
}

export function InventoryModals({
    isIngredientModalOpen,
    isMovementModalOpen,
    selectedIngredient,
    activeMovementType,
    isSubmitting,
    onCloseIngredientModal,
    onCloseMovementModal,
    onSubmitIngredient,
    onSubmitMovement,
}: InventoryModalsProps) {
    return (
        <>
            <Modal
                isOpen={isIngredientModalOpen}
                onClose={onCloseIngredientModal}
                title={
                    selectedIngredient
                        ? INVENTORY_LABELS.editIngredientModalTitle
                        : INVENTORY_LABELS.createIngredientModalTitle
                }
                maxWidth="max-w-xl"
            >
                <IngredientForm
                    initialData={selectedIngredient || undefined}
                    onSubmit={onSubmitIngredient}
                    onCancel={onCloseIngredientModal}
                    isLoading={isSubmitting}
                />
            </Modal>

            <Modal
                isOpen={isMovementModalOpen}
                onClose={onCloseMovementModal}
                title={`${selectedIngredient?.name || ''}${INVENTORY_LABELS.movementModalSuffix}`}
                maxWidth="max-w-xl"
            >
                {selectedIngredient && (
                    <StockMovementForm
                        ingredient={selectedIngredient}
                        type={activeMovementType}
                        onSubmit={onSubmitMovement}
                        onCancel={onCloseMovementModal}
                        isLoading={isSubmitting}
                    />
                )}
            </Modal>
        </>
    )
}
