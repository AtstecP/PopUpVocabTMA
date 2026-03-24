import React from 'react';

export default function CategoryList({ categories, onSelectCategory }) {
  return (
    <div className="modern-dashboard scrollable-content">
      <header className="modern-header">
        <h1>Vocabulary</h1>
      </header>
      <p className="section-desc">Choose a topic to begin your session.</p>

      <div className="modern-category-list">
        {categories.map(cat => (
          <div key={cat.id} className="modern-category-card" onClick={() => onSelectCategory(cat)}>
            <div className="card-icon-box">{cat.icon}</div>
            <div className="card-info">
              <h3>{cat.title}</h3>
              <p>{cat.count} words</p>
            </div>
            <div className="card-arrow">➔</div>
          </div>
        ))}
      </div>
    </div>
  );
}