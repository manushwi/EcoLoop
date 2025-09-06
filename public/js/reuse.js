document.addEventListener('DOMContentLoaded', function () {
  const host = document.getElementById('reuseIdeas');
  if (!host) return;

  const ideas = [
    { title: 'Planter Pot', desc: 'Turn large containers into herb planters with drainage holes.' },
    { title: 'Cable Organizer', desc: 'Cut and repurpose tubes or boxes to route and hide cables neatly.' },
    { title: 'Storage Bin', desc: 'Use cleaned jars and boxes to store screws, spices, or crafting items.' },
    { title: 'Desk Caddy', desc: 'Upcycle cartons into pen holders with dividers and labels.' },
    { title: 'Pet Toy', desc: 'Convert fabric or plastic into safe DIY toys with supervision.' },
  ];

  ideas.forEach((idea, i) => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.style.cssText = 'padding:12px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:rgba(255,255,255,0.03);display:grid;gap:6px;';

    const h3 = document.createElement('h3');
    h3.textContent = idea.title;
    h3.style.margin = '0';

    const p = document.createElement('p');
    p.textContent = idea.desc;
    p.style.margin = '0';

    const btn = document.createElement('button');
    btn.textContent = 'Mark as Done';
    btn.style.cssText = 'justify-self:start;padding:8px 12px;border-radius:10px;border:1px solid rgba(31,212,97,0.4);background:#1fd46120;color:#1fd461;font-weight:600;cursor:pointer;';

    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = 'Completed ✓';
      card.style.transition = 'background 220ms ease, transform 160ms ease';
      card.style.background = 'rgba(31,212,97,0.1)';
      card.style.transform = 'translateY(-1px)';
      setTimeout(() => card.style.transform = 'translateY(0)', 200);
    });

    card.appendChild(h3);
    card.appendChild(p);
    card.appendChild(btn);
    host.appendChild(card);
  });
});


