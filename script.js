(function(){
  var btn = document.getElementById('navToggle');
  var headerInner = document.getElementById('headerInner');
  if(btn && headerInner){
    btn.addEventListener('click', function(){
      var open = headerInner.classList.toggle('mobile-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // dynamically set CSS --header-height to match actual header height
  function updateHeaderHeight(){
    var header = document.querySelector('.site-header');
    if(!header) return;
    var h = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', h + 'px');
  }

  // header solid/transparent toggle based on hero position
  function updateHeaderState(){
    var header = document.querySelector('.site-header');
    var hero = document.querySelector('.hero');
    if(!header || !hero) return;
    var heroBottom = hero.getBoundingClientRect().bottom;
    var threshold = header.offsetHeight + 8; // small buffer
    if(heroBottom <= threshold){
      header.classList.remove('transparent');
      header.classList.add('solid');
    } else {
      header.classList.remove('solid');
      header.classList.add('transparent');
    }
  }

  // throttle scroll updates using requestAnimationFrame
  var ticking = false;
  function onScroll(){
    if(!ticking){
      window.requestAnimationFrame(function(){
        updateHeaderState();
        ticking = false;
      });
      ticking = true;
    }
  }

  // run on load and resize so the hero top is never hidden by the fixed header
  window.addEventListener('load', function(){ updateHeaderHeight(); updateHeaderState(); });
  window.addEventListener('resize', function(){ updateHeaderHeight(); updateHeaderState(); });
  window.addEventListener('scroll', onScroll, {passive:true});
  // initial call in case script runs after load
  updateHeaderHeight();
  updateHeaderState();

  // Events carousel initialization and controls
  function initCarousels(){
    var carousels = document.querySelectorAll('.carousel');
    carousels.forEach(function(carousel){
      var track = carousel.querySelector('.carousel-track');
      if(!track) return;
      var slides = Array.prototype.slice.call(track.children);
      var prevBtn = carousel.querySelector('.carousel-btn.prev');
      var nextBtn = carousel.querySelector('.carousel-btn.next');
      var indicators = Array.prototype.slice.call(carousel.querySelectorAll('.indicator'));
      var current = 0;
      var slideCount = slides.length;
      var autoInterval = 5000;
      var timer = null;

      // make carousel focusable for keyboard navigation
      if(!carousel.hasAttribute('tabindex')) carousel.setAttribute('tabindex', '0');

      function update(){
        // translate track
        track.style.transform = 'translateX(' + (-current * 100) + '%)';
        // update aria-hidden on slides
        slides.forEach(function(s, i){ s.setAttribute('aria-hidden', i !== current ? 'true' : 'false'); });
        // update indicators
        indicators.forEach(function(ind, i){
          var selected = (i === current);
          ind.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
      }

      function goTo(index){
        current = (index + slideCount) % slideCount;
        update();
      }

      function next(){ goTo(current + 1); }
      function prev(){ goTo(current - 1); }

      // attach button handlers
      if(nextBtn) nextBtn.addEventListener('click', function(e){ e.preventDefault(); next(); resetTimer(); });
      if(prevBtn) prevBtn.addEventListener('click', function(e){ e.preventDefault(); prev(); resetTimer(); });

      // indicators
      indicators.forEach(function(ind){
        ind.addEventListener('click', function(){
          var target = parseInt(this.getAttribute('data-slide-to') || '0', 10);
          goTo(target);
          resetTimer();
        });
      });

      // keyboard navigation when carousel has focus
      carousel.addEventListener('keydown', function(e){
        if(e.key === 'ArrowLeft') { prev(); resetTimer(); }
        if(e.key === 'ArrowRight'){ next(); resetTimer(); }
      });

      // auto-advance
      function startTimer(){
        if(timer) return;
        timer = setInterval(function(){ next(); }, autoInterval);
      }
      function stopTimer(){ if(timer){ clearInterval(timer); timer = null; } }
      function resetTimer(){ stopTimer(); startTimer(); }

      // pause on hover/focus
      carousel.addEventListener('mouseenter', stopTimer);
      carousel.addEventListener('mouseleave', startTimer);
      carousel.addEventListener('focusin', stopTimer);
      carousel.addEventListener('focusout', startTimer);

      // initialize
      // ensure slides layout is correct
      track.style.width = (100 * slideCount) + '%';
      slides.forEach(function(s){ s.style.width = (100 / slideCount) + '%'; });
      update();
      startTimer();
    });
  }

  // run carousel init on DOM ready
  function populateEvents(){
    // fetch events.json and populate upcoming and recent sections
    var upcomingContainer = document.getElementById('upcomingContainer');
    var recentContainer = document.getElementById('recentContainer');
    if(!upcomingContainer && !recentContainer) return;

    fetch('events.json').then(function(resp){
      if(!resp.ok) throw new Error('Failed to load events.json');
      return resp.json();
    }).then(function(data){
      var upcoming = data.upcoming || [];
      var recent = data.recent || [];

      // render upcoming as static cards (recent-grid/recent-card)
      if(upcomingContainer){
        upcomingContainer.innerHTML = upcoming.map(function(e){
          return '<article class="recent-card">'
            + '<img src="'+ (e.img || '') + '" alt="'+ (e.title || '') +'" />'
            + '<div class="card-info"><h4>'+ (e.title || '') + '</h4>'
            + '<p class="meta">'+ (e.date || '') + ' — ' + (e.location || '') + '</p>'
            + '<p><a href="'+ (e.url || '#') +'">Read more</a></p></div></article>';
        }).join('');
      }

      // render recent as a carousel
      if(recentContainer){
        var slidesHtml = recent.map(function(e,i){
          return '<article class="carousel-slide" data-index="'+i+'" aria-hidden="'+ (i===0 ? 'false':'true') +'">'
            + '<img src="'+ (e.img || '') +'" alt="'+ (e.title || '') +'"/>'
            + '<div class="slide-info"><h4>'+ (e.title || '') +'</h4>'
            + '<p class="meta">'+ (e.date || '') +' — '+ (e.location || '') +'</p>'
            + '<p><a href="'+ (e.url || '#') +'">Read more</a></p></div></article>';
        }).join('');

        var indicatorsHtml = recent.map(function(_,i){
          return '<button class="indicator" data-slide-to="'+i+'" aria-selected="'+ (i===0 ? 'true':'false') +'" aria-label="Slide '+ (i+1) +'"></button>';
        }).join('');

        recentContainer.innerHTML = '<div class="carousel" aria-roledescription="carousel">'
          + '<div class="carousel-track">'+ slidesHtml +'</div>'
          + '<button class="carousel-btn prev" aria-label="Previous slide">‹</button>'
          + '<button class="carousel-btn next" aria-label="Next slide">›</button>'
          + '<div class="carousel-indicators" role="tablist" aria-label="Recent event slides">'+ indicatorsHtml +'</div>'
          + '</div>';
      }

      // initialize carousels after DOM insertion
      try{ initCarousels(); }catch(e){ /* ignore */ }
    }).catch(function(err){
      console.error('Could not load events.json:', err);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ populateEvents(); initCarousels(); });
  } else {
    populateEvents();
    initCarousels();
  }

  // initial call in case script runs after load
  updateHeaderHeight();
  updateHeaderState();

})();
