const profile = {
    name: "Đăng Khoa",
    nickname: "Reiya",
    tagline: "Mình mới học làm web, thích nghe nhạc, xem phim và uống cà phê.",
    bio: "Mình mới học làm web để giải trí, mong nhận được nhiều phản hồi và góp ý.",
    interests: ["Nghe nhạc", "Xem phim", "Uống cà phê"],
    email: "dangkhoa326dn@gmail.com",
    phone: "",
    socials: [
        { name: "Facebook", url: "" },
        { name: "Instagram", url: "" },
        { name: "TikTok", url: "" }
    ],
    products: []
};

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function safeWebUrl(value) {
    if (!value) return "";
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
        return "";
    }
}

function renderInterests() {
    const list = document.getElementById("interestList");
    for (const interest of profile.interests) {
        const item = document.createElement("li");
        item.textContent = interest;
        list.append(item);
    }
}

function renderProducts() {
    const grid = document.getElementById("productGrid");
    if (profile.products.length === 0) {
        const empty = document.createElement("p");
        empty.className = "products-empty";
        empty.textContent = "Hiện mình chưa có sản phẩm nào để chia sẻ. Khi có sản phẩm, mình sẽ cập nhật ở đây nhé!";
        grid.append(empty);
        return;
    }

    for (const product of profile.products) {
        const card = document.createElement("article");
        card.className = "product-card";

        const art = document.createElement("div");
        art.className = "product-art";
        art.setAttribute("aria-hidden", "true");
        art.textContent = product.icon || "✦";

        const content = document.createElement("div");
        content.className = "product-content";

        const category = document.createElement("p");
        category.className = "product-category";
        category.textContent = product.category || "Sản phẩm";

        const title = document.createElement("h3");
        title.textContent = product.name;

        const description = document.createElement("p");
        description.className = "product-description";
        description.textContent = product.description;

        const bottom = document.createElement("div");
        bottom.className = "product-bottom";

        const price = document.createElement("span");
        price.className = "product-price";
        price.textContent = product.price;

        const link = document.createElement("a");
        link.className = "product-link";
        const productUrl = safeWebUrl(product.url);
        link.href = productUrl || "#contact";
        link.textContent = productUrl ? "Xem sản phẩm ↗" : "Liên hệ để hỏi ↗";
        if (productUrl) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }

        bottom.append(price, link);
        content.append(category, title, description, bottom);
        card.append(art, content);
        grid.append(card);
    }
}

function renderContacts() {
    const links = document.getElementById("contactLinks");
    const contacts = [];
    if (profile.email) contacts.push({ name: "Email", url: `mailto:${profile.email}` });
    if (profile.phone) contacts.push({ name: "Điện thoại", url: `tel:${profile.phone}` });
    for (const social of profile.socials) {
        const url = safeWebUrl(social.url);
        if (url) contacts.push({ name: social.name, url, external: true });
    }

    if (contacts.length === 0) {
        const empty = document.createElement("p");
        empty.className = "contact-empty";
        empty.textContent = "Thêm email, số điện thoại hoặc liên kết mạng xã hội trong trang-ca-nhan.js để mọi người có thể tìm thấy bạn.";
        links.append(empty);
        return;
    }

    for (const contact of contacts) {
        const link = document.createElement("a");
        link.className = "contact-link";
        link.href = contact.url;
        link.textContent = contact.name;
        const arrow = document.createElement("span");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↗";
        link.append(arrow);
        if (contact.external) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
        links.append(link);
    }
}

function renderProfile() {
    setText("brandName", profile.nickname);
    setText("footerName", profile.nickname);
    setText("profileName", profile.name);
    setText("profileNickname", profile.nickname);
    setText("profileTagline", profile.tagline);
    setText("profileBio", profile.bio);
    setText("avatarInitials", Array.from(profile.nickname.trim()).slice(0, 3).join("").toUpperCase());
    document.title = `${profile.name} — Trang cá nhân`;
    renderInterests();
    renderProducts();
    renderContacts();
}

renderProfile();
