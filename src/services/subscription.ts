import pb from '@/lib/pocketbase/client'
import type { SubscriptionPlanRecord, SubscriptionRecord } from '@/lib/types'

export async function listSubscriptionPlans(): Promise<SubscriptionPlanRecord[]> {
  try {
    return await pb.collection('subscription_plans').getFullList<SubscriptionPlanRecord>({
      sort: 'price',
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao buscar planos de assinatura:', err)
    return []
  }
}

export async function getSubscriptionPlanById(id: string): Promise<SubscriptionPlanRecord | null> {
  try {
    return await pb.collection('subscription_plans').getOne<SubscriptionPlanRecord>(id, {
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao buscar plano de assinatura por ID:', err)
    return null
  }
}

export async function updateSubscriptionPlan(
  id: string,
  data: Partial<SubscriptionPlanRecord>,
): Promise<SubscriptionPlanRecord> {
  return await pb.collection('subscription_plans').update<SubscriptionPlanRecord>(id, data)
}

export async function listSubscriptions(): Promise<SubscriptionRecord[]> {
  try {
    return await pb.collection('subscriptions').getFullList<SubscriptionRecord>({
      expand: 'user,plan',
      sort: '-created',
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao listar assinaturas:', err)
    return []
  }
}

export async function getUserSubscription(userId: string): Promise<SubscriptionRecord | null> {
  if (!userId) return null
  try {
    const list = await pb.collection('subscriptions').getList<SubscriptionRecord>(1, 1, {
      filter: `user = "${userId}" && status = "active"`,
      expand: 'plan',
      requestKey: null,
    })
    return list.items[0] ?? null
  } catch (err) {
    console.error('Erro ao buscar assinatura do usuário:', err)
    return null
  }
}
