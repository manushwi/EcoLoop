document.addEventListener('DOMContentLoaded', function () {
  const host = document.getElementById('recycleChecklist');
  if (!host) return;

  const steps = [
    'Rinse and dry the item to remove residue',
    'Remove caps, labels, or mixed-material parts',
    'Flatten or compress if possible to save space',
    'Place in the correct color/number bin per local rules',
    'Avoid bagging recyclables unless required',
  ];

  steps.forEach((text, idx) => {
    const row = document.createElement('label');
    row.className = 'recycle-step-row';
    row.style.cssText = 'display:flex;align-items:center;gap:10px;cursor:pointer;';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.ariaLabel = text;

    const pill = document.createElement('span');
    pill.textContent = String(idx + 1).padStart(2, '0');
    pill.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:#1fd46120;color:#1fd461;font-weight:700;font-size:12px;';

    const label = document.createElement('span');
    label.textContent = text;

    row.appendChild(box);
    row.appendChild(pill);
    row.appendChild(label);

    box.addEventListener('change', () => {
      row.style.transition = 'background 200ms ease, transform 150ms ease';
      if (box.checked) {
        row.style.background = 'rgba(31,212,97,0.08)';
        row.style.transform = 'translateX(2px)';
      } else {
        row.style.background = 'transparent';
        row.style.transform = 'translateX(0)';
      }
    });

    host.appendChild(row);
  });

  // subtle entrance animation
  Array.from(host.children).forEach((child, i) => {
    child.style.opacity = '0';
    child.style.transform = 'translateY(6px)';
    setTimeout(() => {
      child.style.transition = 'opacity 220ms ease, transform 220ms ease';
      child.style.opacity = '1';
      child.style.transform = 'translateY(0)';
    }, 60 * i);
  });
});


