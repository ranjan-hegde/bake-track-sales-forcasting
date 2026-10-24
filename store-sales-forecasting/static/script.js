// Nexus Forecast - seller-facing UI logic.
// One day in, one number out. History + calendar context are auto-filled by the API.

// Default both date pickers to today, then wire the buttons.
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('target_date').value = today;
    document.getElementById('record_date').value = today;

    // Bind handlers here instead of inline onclick="" so they work no matter how
    // this file is loaded or cached - the buttons don't depend on global scope.
    document.getElementById('forecast-btn').addEventListener('click', forecast);
    document.getElementById('record-btn').addEventListener('click', recordSale);
});

// Seller inputs shared by /forecast and /record-sale (NO manual sales history - it's looked up).
function collectInputs() {
    return {
        publication_name: document.getElementById('publication_name').value,
        publication_category: document.getElementById('publication_category').value,
        region: document.getElementById('region').value,
        promotion: parseInt(document.getElementById('promotion').value),
        special_events: document.getElementById('special_events').value,
        price: parseFloat(document.getElementById('price').value),
        customer_age: parseInt(document.getElementById('customer_age').value),
        income_level: document.getElementById('income_level').value,
        educational_background: document.getElementById('educational_background').value,
        occupation: document.getElementById('occupation').value,
    };
}

async function forecast() {
    const data = collectInputs();
    data.target_date = document.getElementById('target_date').value;
    data.model_type = document.getElementById('model_type').value;

    const valueEl = document.getElementById('forecast-value');
    const labelEl = document.getElementById('forecast-label');
    const detectedEl = document.getElementById('detected');

    valueEl.classList.add('loading');
    valueEl.innerText = '...';
    labelEl.innerText = 'crunching the numbers';
    detectedEl.style.display = 'none';

    try {
        const response = await fetch('/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(await extractError(response));
        const result = await response.json();

        valueEl.classList.remove('loading');
        animateValue('forecast-value', 0, result.predicted_sales_quantity, 900);
        labelEl.innerText = `copies projected · ${result.model_used.toUpperCase()}`;
        renderDetected(result.detected, result.sales_context);
    } catch (error) {
        console.error('Forecast error:', error);
        valueEl.classList.remove('loading');
        valueEl.innerText = '!';
        labelEl.innerText = error.message || 'Something went wrong';
    }
}

// Render the auto-detected calendar context + the history basis behind the number.
function renderDetected(detected, ctx) {
    const badges = document.getElementById('badges');
    const basis = document.getElementById('basis');
    badges.innerHTML = '';

    const add = (text, cls) => {
        const el = document.createElement('span');
        el.className = `badge ${cls}`;
        el.innerText = text;
        badges.appendChild(el);
    };

    add(`${detected.day_name}, ${detected.date}`, 'neutral');
    add(detected.season, 'season');
    if (detected.is_festival) add(`\u{1F389} ${detected.holiday_name || 'Festival'}`, 'festival');
    else if (detected.is_holiday) add(`\u{1F3DB} ${detected.holiday_name || 'Holiday'}`, 'holiday');
    if (detected.is_weekend) add('Weekend', 'weekend');

    let text = `Based on ${ctx.source} — baseline ~${ctx.previous_day_sales}/day, ~${ctx.previous_week_sales}/week.`;
    if (ctx.festival_reference !== undefined) {
        text += ` Past festival days averaged ~${ctx.festival_reference}/day (${ctx.festival_days} on record).`;
    }
    basis.innerText = text;
    document.getElementById('detected').style.display = 'block';
}

async function recordSale() {
    const data = collectInputs();
    data.target_date = document.getElementById('record_date').value;
    data.actual_sales_quantity = parseInt(document.getElementById('actual_sales').value);

    const btn = document.getElementById('record-btn');
    const status = document.getElementById('record-status');

    btn.disabled = true;
    status.className = 'record-status working';
    status.innerText = '⏳ Saving and retraining both models (~15-20s)… please wait.';

    try {
        const response = await fetch('/record-sale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(await extractError(response));
        const result = await response.json();

        status.className = 'record-status done';
        status.innerText = `✅ Saved & retrained — the model now learns from ${result.total_rows.toLocaleString()} days of sales.`;
    } catch (error) {
        console.error('Record-sale error:', error);
        status.className = 'record-status error';
        status.innerText = `⚠️ ${error.message || 'Could not save. Is an API key required?'}`;
    } finally {
        btn.disabled = false;
    }
}

// Pull a human-readable message out of a FastAPI error response.
async function extractError(response) {
    try {
        const body = await response.json();
        if (typeof body.detail === 'string') return body.detail;
        if (body.detail && body.detail.allowed) {
            return `"${body.detail.value}" isn't a known ${body.detail.field}.`;
        }
        return `Request failed (${response.status}).`;
    } catch {
        return `Request failed (${response.status}).`;
    }
}

// Count-up animation for the forecast number. Time-based so it always finishes
// in ~duration ms whether the number is 12 or 12,000.
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (start === end) { obj.innerText = end.toLocaleString(); return; }
    const startTime = performance.now();
    const range = end - start;
    const tick = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        obj.innerText = Math.round(start + range * t).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
