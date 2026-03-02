'use client'

import React, { useEffect, useState } from 'react'
import { Modal } from '@/modules/shared/components/Modal'
import { FormInput } from '@/modules/shared/components/FormInput'
import { PhoneInput } from '@/modules/shared/components/PhoneInput'
import { Button } from '@/modules/shared/components/Button'
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch'
import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../types'
import { useTranslation } from '@/modules/i18n/hooks/useTranslation'
import { customerService } from '../services'
import { toast } from 'sonner'

interface CustomerFormProps {
    isOpen: boolean
    onClose: () => void
    customer?: Customer // If provided, we are in Edit mode
    onSuccess: () => void
}

export function CustomerForm({ isOpen, onClose, customer, onSuccess }: CustomerFormProps) {
    const { t } = useTranslation()
    const customerT = t.customers
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState<UpdateCustomerDto>({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        notes: '',
        credit_limit: 0,
        credit_limit_enabled: false,
        max_open_orders: 5
    })

    useEffect(() => {
        if (customer) {
            setFormData({
                first_name: customer.first_name,
                last_name: customer.last_name,
                phone: customer.phone,
                email: customer.email || '',
                notes: customer.notes || '',
                credit_limit: Number(customer.credit_limit),
                credit_limit_enabled: customer.credit_limit_enabled,
                max_open_orders: customer.max_open_orders
            })
        } else {
            setFormData({
                first_name: '',
                last_name: '',
                phone: '',
                email: '',
                notes: '',
                credit_limit: 0,
                credit_limit_enabled: false,
                max_open_orders: 5
            })
        }
    }, [customer, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            if (customer) {
                await customerService.updateCustomer(customer.id, formData)
                toast.success(customerT.messages.updateSuccess)
            } else {
                await customerService.createCustomer(formData as CreateCustomerDto)
                toast.success(customerT.messages.createSuccess)
            }
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Form submission failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={customer ? `${customer.first_name} ${customer.last_name}` : customerT.newCustomer}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        id="first_name"
                        name="first_name"
                        label={customerT.form.firstName}
                        value={formData.first_name || ''}
                        onChange={(val) => setFormData({ ...formData, first_name: val })}
                        required
                        placeholder="AHMET"
                    />
                    <FormInput
                        id="last_name"
                        name="last_name"
                        label={customerT.form.lastName}
                        value={formData.last_name || ''}
                        onChange={(val) => setFormData({ ...formData, last_name: val })}
                        required
                        placeholder="YILMAZ"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <PhoneInput
                        id="phone"
                        name="phone"
                        label={customerT.form.phone}
                        value={formData.phone || ''}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                        required
                    />
                    <FormInput
                        id="email"
                        name="email"
                        label={customerT.form.email}
                        type="email"
                        value={formData.email || ''}
                        onChange={(val) => setFormData({ ...formData, email: val })}
                        placeholder="ahmet@example.com"
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-border-light">
                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                        BORÇ VE LİMİT AYARLARI
                    </h4>

                    <div className="flex items-center justify-between p-3 bg-bg-app rounded-sm border border-border-light">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-text-primary uppercase tracking-tight">
                                {customerT.form.creditLimitEnabled}
                            </span>
                            <span className="text-[9px] text-text-muted">Müşteriye veresiye limiti tanımla.</span>
                        </div>
                        <RmsSwitch
                            checked={formData.credit_limit_enabled || false}
                            onChange={(val) => setFormData({ ...formData, credit_limit_enabled: val })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormInput
                            id="credit_limit"
                            name="credit_limit"
                            label={customerT.form.creditLimit}
                            type="number"
                            disabled={!formData.credit_limit_enabled}
                            value={String(formData.credit_limit || 0)}
                            onChange={(val) => setFormData({ ...formData, credit_limit: Number(val) })}
                            placeholder="0.00"
                        />
                        <FormInput
                            id="max_open_orders"
                            name="max_open_orders"
                            label={customerT.form.maxOpenOrders}
                            type="number"
                            value={String(formData.max_open_orders || 5)}
                            onChange={(val) => setFormData({ ...formData, max_open_orders: Number(val) })}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <FormInput
                        id="notes"
                        name="notes"
                        label={customerT.form.notes}
                        isTextarea
                        value={formData.notes || ''}
                        onChange={(val) => setFormData({ ...formData, notes: val })}
                        placeholder="..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                    <Button variant="secondary" type="button" onClick={onClose}>
                        İPTAL
                    </Button>
                    <Button variant="primary" type="submit" isLoading={isLoading}>
                        {customer ? 'GÜNCELLE' : 'OLUŞTUR'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
