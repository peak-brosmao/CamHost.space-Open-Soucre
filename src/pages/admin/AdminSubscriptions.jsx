import React from 'react';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: '#00d4ff',
    features: ['10 GB Storage', 'Basic upload speed', 'Public file sharing', 'Standard support'],
    badge: null,
  },
  {
    name: 'Premium',
    price: '$9.99',
    period: 'per month',
    color: '#7b4fff',
    features: ['Unlimited Storage', 'Priority upload speed', 'Private file sharing', 'Custom share links', 'Priority support', 'API access'],
    badge: 'Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    color: '#ffab2e',
    features: ['Unlimited Storage', 'Dedicated resources', 'Custom domain', 'SLA guarantee', 'Dedicated support', 'Custom integrations'],
    badge: null,
  },
];

export default function AdminSubscriptions() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Subscription Management
            <span className="admin-page-badge" style={{ background: 'rgba(255,171,46,0.15)', color: '#ffab2e', border: '1px solid rgba(255,171,46,0.3)' }}>Optional</span>
          </h1>
          <p className="admin-page-desc">Manage subscription plans, payment history, and user upgrades.</p>
        </div>
      </div>

      {/* Plans Display */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        {PLANS.map(plan => (
          <div key={plan.name} className="admin-card" style={{ border: `1px solid ${plan.color}35`, position: 'relative' }}>
            {plan.badge && (
              <span className="admin-badge info" style={{ position: 'absolute', top: 16, right: 16, background: plan.color + '20', color: plan.color }}>
                {plan.badge}
              </span>
            )}
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: plan.color }}>{plan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{plan.price}</span>
                <span style={{ color: 'var(--adm-muted)', fontSize: '0.8rem' }}>{plan.period}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                  <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>
                  <span style={{ color: 'var(--adm-text)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <span className="admin-badge neutral">Configure via API</span>
            </div>
          </div>
        ))}
      </div>

      {/* Scaffold sections */}
      {[
        { title: 'Payment History', items: ['View all transactions', 'Filter by plan / date', 'Export to CSV', 'Refund management'] },
        { title: 'Subscription Management', items: ['Active subscriptions list', 'Cancel / pause subscription', 'Upgrade / downgrade plan', 'Usage per subscriber'] },
        { title: 'Storage Upgrade', items: ['Manual storage upgrade', 'Custom quota per user', 'Bulk upgrade', 'Storage purchase history'] },
      ].map(({ title, items }) => (
        <div key={title} className="admin-card" style={{ marginBottom: 20 }}>
          <h3 className="admin-card-title" style={{ marginBottom: 16 }}>{title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item} className="admin-scaffold-row">
                <span className="admin-scaffold-dot" />
                <span style={{ fontSize: '0.875rem', color: 'var(--adm-text)' }}>{item}</span>
                <span className="admin-badge neutral" style={{ marginLeft: 'auto' }}>Coming Soon</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
