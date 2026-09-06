function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const orderUrl = `order.html?item=${encodeURIComponent(product.name)}&price=${encodeURIComponent(product.price)}`;

  card.innerHTML = `
    <div class="product-card__image">
      <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">
    </div>
    <div class="product-card__body">
      <span class="product-card__category">${product.categoryLabel}</span>
      <h3 class="product-card__name">${product.name}</h3>
      <p class="product-card__desc">${product.description}</p>
      <div class="product-card__footer">
        <span class="product-card__price">${formatNumber(product.price)}</span>
        <a class="btn btn-primary" href="${orderUrl}">สั่งซื้อ</a>
      </div>
    </div>
  `;

  return card;
}