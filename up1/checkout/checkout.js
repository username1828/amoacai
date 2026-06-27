(function () {
  var PARADISE_API_URL = "https://multi.paradisepags.com/api/v1/transaction.php";
  var PARADISE_API_KEY = "sk_8702a660ccae6aedd010823c0c125e8309c336b5a7e8bdc6357409df16379fd6";
  var PARADISE_PRODUCT_HASH = "prod_9d1351d1c4e33d87";
  var FRETE_VALOR = 12.00;
  var POLLING_INTERVAL_MS = 3000;
  var POLLING_TIMEOUT_MS = 600000;

  var UPSELLS = [
    {
      id: "combo-refri",
      name: "Combo Refri",
      description: "Coca, Guaraná e sortido geladinhos — pra todo mundo e o jogo não parar",
      img: "../../images/combo_refri.jpg",
      oldPrice: 34.9,
      price: 20.59
    },
    {
      id: "balde-6-cervejas",
      name: "Balde 6 Cervejas",
      description: "6 cervejas geladas no balde térmico — não pode faltar",
      img: "../../images/balde_6_cervejas.jpg",
      oldPrice: 34.9,
      price: 20.59
    },
    {
      id: "tabua-de-frios",
      name: "Álbum Copa Do Mundo",
      description: "Oficial 2026 Brochura + 70 Figurinhas",
      img: "../../images/album.png",
      oldPrice: 109.9,
      price: 38.46
    },
    {
      id: "porcoes-de-boteco",
      name: "Kit Torcida 12 Itens",
      description: "Bandeira, óculos, corneta, bastões, pulseira, faixas, tinta facial, tatuagem e acessórios.",
      img: "../../images/kittorcida.png",
      oldPrice: 48.9,
      price: 19.56
    },
    {
      id: "kit-torcedor",
      name: "Kit Torcedor",
      description: "Camiseta do Brasil 1ª Linha, bandeirão e corneta — torça com estilo",
      img: "../../images/kit_torcedor.jpg",
      oldPrice: 119.90,
      price: 43.16
    }
  ];

  var selectedUpsells = {};
  var upsellSizes = {};

  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatPrice(val) {
    return val.toFixed(2).replace(".", ",");
  }

  function getTotal() {
    var upsellSum = UPSELLS.filter(function (u) { return selectedUpsells[u.id]; })
      .reduce(function (s, u) { return s + u.price; }, 0);
    return FRETE_VALOR + upsellSum;
  }

  function upsellLineName(u) {
    return (u.id === "kit-torcedor" && upsellSizes["kit-torcedor"]) ? u.name + " (" + upsellSizes["kit-torcedor"] + ")" : u.name;
  }

  function renderUpsellSizeBox(selected) {
    var vals = ["Tam. P", "Tam. M", "Tam. G", "Tam. GG"], labels = ["P", "M", "G", "GG"];
    var btns = vals.map(function (s, k) {
      return '<button type="button" class="upsell-size-btn' + (upsellSizes["kit-torcedor"] === s ? " active" : "") + '" data-upsell-size="' + s + '">' + labels[k] + "</button>";
    }).join("");
    return '<div class="upsell-size" id="upsell-size-kit-torcedor" style="display:' + (selected ? "block" : "none") + '">' +
      '<span class="upsell-size-label">👕 Escolha o tamanho da camiseta:</span>' +
      '<div class="upsell-size-btns">' + btns + "</div></div>";
  }

  function renderPage() {
    var total = getTotal();

    var upsellCards = UPSELLS.map(function (u) {
      var checked = !!selectedUpsells[u.id];
      var discount = Math.round((1 - u.price / u.oldPrice) * 100);
      return (
        '<label class="upsell-card' + (checked ? " selected" : "") + '" data-upsell-id="' + u.id + '">' +
          '<input type="checkbox" data-upsell-id="' + u.id + '"' + (checked ? " checked" : "") + '>' +
          '<img src="' + u.img + '" alt="' + escapeHtml(u.name) + '" onerror="this.style.opacity=0.3">' +
          '<div class="upsell-info">' +
            '<strong>' + escapeHtml(u.name) + '</strong>' +
            '<span>' + escapeHtml(u.description) + '</span>' +
            '<div class="upsell-prices">' +
              '<span class="price">+ R$ ' + formatPrice(u.price) + '</span>' +
              '<span class="old">R$ ' + formatPrice(u.oldPrice) + '</span>' +
            '</div>' +
          '</div>' +
          (discount > 0 ? '<span class="upsell-tag">-' + discount + '%</span>' : '') +
        '</label>' +
        (u.id === "kit-torcedor" ? renderUpsellSizeBox(checked) : "")
      );
    }).join('');

    $("checkout-content").innerHTML =
      '<div style="max-width:480px;margin:0 auto;padding:16px">' +
        '<div class="order-card open" id="order-card">' +
          '<div class="order-card-body">' +
            '<div class="order-item-row">' +
              '<span class="order-item-qty">1x</span>' +
              '<span class="order-item-name">Taxa de entrega - 30 a 50 min</span>' +
            '</div>' +
            (Object.keys(selectedUpsells).filter(function(k){ return selectedUpsells[k]; }).length > 0
              ? UPSELLS.filter(function(u){ return selectedUpsells[u.id]; }).map(function(u){
                  return '<div class="order-item-row is-upsell">' +
                    '<span class="order-item-qty">1x</span>' +
                    '<span class="order-item-name">' + escapeHtml(upsellLineName(u)) + '</span>' +
                    '<span class="order-item-price">R$ ' + formatPrice(u.price) + '</span>' +
                  '</div>';
                }).join('')
              : '') +
            '<div class="order-breakdown">' +
              '<div class="order-breakdown-row total"><span>Total</span><span>R$ ' + formatPrice(total) + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="upsell-section" style="margin-top:16px">' +
          '<h3>Turbine seu kit ✨</h3>' +
          '<p class="upsell-lead">Ofertas exclusivas — o valor já entra no total e no PIX</p>' +
          '<div class="upsell-list">' + upsellCards + '</div>' +
        '</div>' +

        '<div id="form-error" class="form-error" hidden role="alert"></div>' +

        '<div class="checkout-actions" style="margin-top:20px">' +
          '<button type="button" class="btn-primary" id="btn-pix">Gerar PIX — R$ ' + formatPrice(total) + '</button>' +
        '</div>' +
      '</div>';

    document.querySelectorAll("[data-upsell-id] input[type=checkbox]").forEach(function (el) {
      el.addEventListener("change", function (e) {
        var id = e.target.dataset.upsellId;
        if (e.target.checked) selectedUpsells[id] = true;
        else delete selectedUpsells[id];
        renderPage();
      });
    });

    document.querySelectorAll("[data-upsell-size]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        upsellSizes["kit-torcedor"] = btn.dataset.upsellSize;
        renderPage();
      });
    });

    $("btn-pix").addEventListener("click", generatePix);
  }

  function showPixStep(response) {
    var pixCode = response.pixCode || "";
    $("checkout-content").innerHTML =
      '<div class="checkout-panel pix-step" style="max-width:480px;margin:24px auto">' +
        '<h2 style="font-size:20px;font-weight:800;margin-bottom:8px">Pague com PIX</h2>' +
        '<div class="pix-total">R$ ' + formatPrice(getTotal()) + '</div>' +
        (pixCode
          ? '<img alt="QR Code PIX" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(pixCode) + '" style="width:200px;height:200px;margin:16px auto;display:block;border-radius:8px">'
          : '') +
        '<div class="pix-code-wrap">' +
          '<label>Código PIX (copia e cola)</label>' +
          '<div class="pix-code-row">' +
            '<input id="pix-code" type="text" readonly value="' + escapeHtml(pixCode) + '">' +
            '<button type="button" class="btn-copy" id="btn-copy-pix">Copiar</button>' +
          '</div>' +
        '</div>' +
        '<div class="pix-waiting">' +
          '<span class="pix-spinner" aria-hidden="true"></span>' +
          '<span>Aguardando confirmação do pagamento...</span>' +
        '</div>' +
      '</div>';

    $("btn-copy-pix").addEventListener("click", function () {
      var input = $("pix-code");
      input.select();
      navigator.clipboard.writeText(input.value).then(function () {
        $("btn-copy-pix").textContent = "Copiado!";
        setTimeout(function () { $("btn-copy-pix").textContent = "Copiar"; }, 2000);
      }).catch(function () {
        document.execCommand("copy");
        $("btn-copy-pix").textContent = "Copiado!";
        setTimeout(function () { $("btn-copy-pix").textContent = "Copiar"; }, 2000);
      });
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pollPixStatus(transactionId) {
    // A documentação enviada contém apenas o endpoint de criação da transação.
    // Quando tiver o endpoint de consulta/webhook da Paradise, ele deve ser ligado aqui.
    console.log("Transação Paradise criada:", transactionId);
  }

  function gerarCPF() {
    var n = Array.from({length: 9}, function() { return Math.floor(Math.random() * 9); });
    var s1 = n.reduce(function(acc, v, i) { return acc + v * (10 - i); }, 0);
    var d1 = (s1 * 10) % 11; if (d1 >= 10) d1 = 0;
    n.push(d1);
    var s2 = n.reduce(function(acc, v, i) { return acc + v * (11 - i); }, 0);
    var d2 = (s2 * 10) % 11; if (d2 >= 10) d2 = 0;
    n.push(d2);
    return n.join("");
  }

  async function generatePix() {
    var btn = $("btn-pix");
    btn.disabled = true;
    btn.textContent = "Gerando PIX...";

    var params = new URLSearchParams(window.location.search);
    if (!params.toString()) {
      params.set("utm_source", "direct");
    }
    var urlLimpa = window.location.origin + window.location.pathname;
    params.set("url", urlLimpa);
    var utmString = params.toString();

    var total = getTotal();
    var amountCents = Math.round(total * 100);

    try {
      var res = await fetch(PARADISE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": PARADISE_API_KEY
        },
        body: JSON.stringify({
          productHash: PARADISE_PRODUCT_HASH,
          amount: amountCents,
          description: "Taxa de entrega",
          reference: "FRETE-" + Date.now(),
          customer: {
            name: "Cliente",
            document: gerarCPF(),
            email: "cliente@checkout.com",
            phone: "11999999999"
          },
          tracking: Object.fromEntries(params.entries())
        })
      });

      var data = await res.json();
      var response = {
        pixCode: data && (data.qr_code || data.pixCode || data.pix_code || ""),
        transactionId: data && (data.transaction_id || data.transactionId || data.id || ""),
        error: data && (data.error || data.message || "")
      };

      if (data && data.status === "success" && response.pixCode) {
        showPixStep(response);
        if (response.transactionId) pollPixStatus(response.transactionId);
        return;
      }

      var box = $("form-error");
      if (box) { box.textContent = (response && response.error) || "Não foi possível gerar o PIX."; box.hidden = false; }
      btn.disabled = false;
      btn.textContent = "Gerar PIX — R$ " + formatPrice(total);
    } catch (err) {
      var box2 = $("form-error");
      if (box2) { box2.textContent = "Erro ao conectar com o servidor. Tente novamente."; box2.hidden = false; }
      btn.disabled = false;
      btn.textContent = "Gerar PIX — R$ " + formatPrice(total);
    }
  }

  renderPage();
})();
