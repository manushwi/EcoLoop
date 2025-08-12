// Tabs
(function(){
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    overview: document.getElementById('overview'),
    challenges: document.getElementById('challenges'),
    badges: document.getElementById('badges'),
    history: document.getElementById('history')
  };
  tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      const name = t.getAttribute('data-tab');
      Object.keys(panels).forEach(k=>panels[k].style.display = (k===name? 'block' : 'none'));
    });
  });

  // animate progress bars on load
  window.addEventListener('load', ()=>{
    document.querySelectorAll('.progress > i').forEach(el=>{
      const w = el.style.width || '50%';
      el.style.width = '0%';
      setTimeout(()=> el.style.width = w, 120);
    });
  });

  // scan action (hook)
  const scan = document.querySelector('.btn-scan');
  if(scan) scan.addEventListener('click', ()=> alert('Open scanner (plug your scanner flow)'));
})();
