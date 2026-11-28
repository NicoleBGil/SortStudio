"use strict";
(() => {
  const el = id => document.getElementById(id);
  if (!el('games')) return;
  const sizes = {easy:4, medium:6, hard:8};
  const shuffled = n => {const a=Array.from({length:n},(_,i)=>i+1);for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const elapsed = start => ((performance.now()-start)/1000).toFixed(1);
  const record = {puzzle:null,prediction:null};
  function dashboard(){
    const items=[['Puzzle',record.puzzle],['Prediction',record.prediction]];
    el('gameDashboard').replaceChildren(...items.map(([name,r])=>{const c=document.createElement('div');c.className='game-result';const h=document.createElement('strong');h.textContent=name;const p=document.createElement('p');p.textContent=r?`${r.level} · ${r.detail} · ${r.time}s`:'Not completed yet';c.append(h,p);return c;}));
  }
  let puzzle = [], selected = -1, moves = 0, puzzleStart = 0, puzzleDone = false, puzzleHints = 0;
  let minimumSwapsAtStart = 0;
  const board = el('puzzleTiles');
  const motionToggle = el('puzzle-motion');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let moving = !motionPreference.matches;
  let tiles = new Map();

  function updateMotion() {
    board.classList.toggle('julieblocks-moving', moving);
    motionToggle.textContent = moving ? 'Pause motion' : 'Resume motion';
    for (const tile of tiles.values()) {
      const avatar = tile.querySelector('.julieblocks-avatar');
      if (avatar) avatar.src = avatar.dataset[moving ? 'animated' : 'still'];
      if (!moving) tile.getAnimations().forEach(animation => animation.cancel());
    }
  }

  function createTile(value) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'puzzle-tile julieblock';
    tile.dataset.value = value;

    const figure = document.createElement('span');
    figure.className = 'julieblocks-figure';
    figure.setAttribute('aria-hidden', 'true');
    figure.style.setProperty('--block-hue', [180, 153, 270, 17, 307, 206, 53, 194][value - 1]);
    figure.style.setProperty('--block-delay', `${-0.37 * value}s`);
    if (value === 5 || value === 7) {
      const avatar = new Image();
      avatar.className = 'julieblocks-avatar';
      avatar.alt = '';
      avatar.decoding = 'async';
      avatar.dataset.animated = `assets/julieblocks/number-${value}.webp`;
      avatar.dataset.still = `assets/julieblocks/number-${value}.png`;
      avatar.src = avatar.dataset[moving ? 'animated' : 'still'];
      figure.append(avatar);
    } else {
      const head = document.createElement('span');
      head.className = 'julieblocks-head';
      const face = document.createElement('span');
      face.className = 'julieblocks-face';
      head.append(face);
      const body = document.createElement('span');
      body.className = 'julieblocks-body';
      body.style.setProperty('--block-columns', Math.ceil(Math.sqrt(Math.max(1, value - 1))));
      for (let i = 1; i < value; i++) body.append(document.createElement('span'));
      figure.append(head, body);
    }

    const label = document.createElement('span');
    label.className = 'julieblocks-value';
    label.textContent = value;
    tile.append(figure, label);
    tile.addEventListener('click', () => chooseTile(Number(tile.dataset.position)));
    return tile;
  }

  function resetPuzzle() {
    puzzle = shuffled(sizes[el('puzzleDifficulty').value] || 6);
    if (puzzle.every((value, i) => value === i + 1)) [puzzle[0], puzzle[1]] = [puzzle[1], puzzle[0]];
    selected = -1;
    moves = 0;
    puzzleHints = 0;
    puzzleDone = false;
    puzzleStart = performance.now();
    minimumSwapsAtStart = minSwaps(puzzle);
    el('puzzleFeedback').textContent = 'Select one block, then another to swap.';
    tiles = new Map(puzzle.map(value => [value, createTile(value)]));
    board.replaceChildren(...tiles.values());
    updateMotion();
    renderPuzzle();
  }

  function renderPuzzle(animateSwap = false) {
    const focused = board.contains(document.activeElement) ? document.activeElement : null;
    const positions = animateSwap && moving
      ? new Map([...tiles].map(([value, tile]) => [value, tile.getBoundingClientRect()]))
      : null;
    puzzle.forEach((value, i) => {
      const tile = tiles.get(value);
      if (board.children[i] !== tile) board.insertBefore(tile, board.children[i] || null);
      tile.classList.toggle('chosen', i === selected);
      tile.classList.toggle('solved', puzzleDone);
      tile.dataset.position = i;
      tile.disabled = puzzleDone;
      tile.setAttribute('aria-pressed', String(i === selected));
      tile.setAttribute('aria-label', `Position ${i + 1}, value ${value}`);
    });
    if (puzzleDone && focused) el('puzzleNew').focus({preventScroll: true});
    else if (focused && focused !== document.activeElement) focused.focus({preventScroll: true});
    if (positions) {
      for (const [value, tile] of tiles) {
        const previous = positions.get(value);
        const next = tile.getBoundingClientRect();
        const x = previous.x - next.x;
        const y = previous.y - next.y;
        if (x || y) {
          tile.getAnimations().forEach(animation => animation.cancel());
          tile.animate([{transform: `translate(${x}px, ${y}px)`}, {transform: 'translate(0, 0)'}],
            {duration: 320, easing: 'cubic-bezier(.2,.75,.2,1)'});
        }
      }
    }
    el('puzzleStats').textContent = `Moves: ${moves}`;
    el('puzzleMetrics').textContent =
      `Difficulty: ${el('puzzleDifficulty').value} · Hints: ${puzzleHints} · Target: ascending order`;
  }

  function chooseTile(position) {
    if (puzzleDone) return;
    const feedback = el('puzzleFeedback');
    if (selected < 0) {
      selected = position;
      feedback.textContent = `Selected ${puzzle[position]}. Choose a second block.`;
      renderPuzzle();
      return;
    }
    if (selected === position) {
      selected = -1;
      feedback.textContent = 'Selection cleared.';
      renderPuzzle();
      return;
    }
    [puzzle[selected], puzzle[position]] = [puzzle[position], puzzle[selected]];
    selected = -1;
    moves++;
    puzzleDone = puzzle.every((value, i) => value === i + 1);
    if (puzzleDone) {
      const time = elapsed(puzzleStart);
      feedback.textContent = `Solved in ${moves} moves (${time}s)! Minimum possible: ${minimumSwapsAtStart} swaps.`;
      record.puzzle = {level: el('puzzleDifficulty').value, detail: `${moves} moves, ${puzzleHints} hints`, time};
      dashboard();
    } else feedback.textContent = 'Swap complete. Keep going!';
    renderPuzzle(true);
  }

  function minSwaps(values) {
    const visited = new Set();
    let cycles = 0;
    for (let i = 0; i < values.length; i++) {
      if (visited.has(i)) continue;
      cycles++;
      for (let j = i; !visited.has(j); j = values[j] - 1) visited.add(j);
    }
    return values.length - cycles;
  }

  motionToggle.addEventListener('click', () => { moving = !moving; updateMotion(); });
  motionPreference.addEventListener('change', event => { moving = !event.matches; updateMotion(); });

  function puzzleHint(){if(puzzleDone)return;const i=puzzle.findIndex((v,k)=>v!==k+1);if(i<0)return;const j=puzzle.indexOf(i+1);puzzleHints++;el('puzzleFeedback').textContent=`Hint: swap positions ${i+1} and ${j+1} to put ${i+1} in its correct place.`;renderPuzzle();}
  let arr=[],pos=0,end=0,round=0,score=0,answered=false,finished=false,predictStart=0,predictHints=0;
  function predictSize(){return el('predictDifficulty').value==='hard'?7:el('predictDifficulty').value==='easy'?4:5;}
  function newPredict(){arr=shuffled(predictSize()).map(v=>v*10);pos=0;end=arr.length-1;round=0;score=0;answered=false;finished=false;predictHints=0;predictStart=performance.now();el('predictFeedback').textContent='Choose the next pair.';showPredict();}
  function showPredict(){el('predictStats').textContent=`Score: ${score} / ${round}`;el('predictNext').disabled=!answered||finished;el('predictNext').textContent=finished?'Completed ✓':'Next round →';el('predictMetrics').textContent=`Accuracy: ${round?Math.round(score/round*100):0}% · Hints: ${predictHints} · Comparisons: ${round}`;el('predictTiles').replaceChildren(...arr.map((v,i)=>{const b=document.createElement('span');b.textContent=v;b.className='predict-tile'+(answered&&!finished&&(i===pos||i===pos+1)?' highlighted':'');return b;}));const opts=el('predictOptions');opts.replaceChildren();if(!finished)for(let i=0;i<arr.length-1;i++){const b=document.createElement('button');b.className='muted';b.textContent=`Positions ${i+1} & ${i+2}`;b.disabled=answered;b.addEventListener('click',()=>answer(i));opts.appendChild(b);}if(!answered&&!finished)el('predictFeedback').textContent=`Round ${round+1}: Which pair will Bubble Sort inspect next?`;}
  function answer(choice){if(answered||finished)return;answered=true;round++;const correct=choice===pos;if(correct)score++;const a=arr[pos],b=arr[pos+1];showPredict();el('predictFeedback').textContent=(correct?'✅ Correct! ':'❌ Not quite. ')+`Compare positions ${pos+1} and ${pos+2} (${a} and ${b}). `+(a>b?'They swap because the left value is larger.':'No swap: the pair is in order.');}
  function nextPredict(){if(!answered||finished)return;if(arr[pos]>arr[pos+1])[arr[pos],arr[pos+1]]=[arr[pos+1],arr[pos]];pos++;if(pos>=end){end--;pos=0;}answered=false;if(end<=0){finished=true;const t=elapsed(predictStart);el('predictFeedback').textContent=`🎉 Bubble Sort complete! ${score}/${round} correct (${Math.round(score/round*100)}%) in ${t}s.`;record.prediction={level:el('predictDifficulty').value,detail:`${score}/${round} correct, ${predictHints} hints`,time:t};dashboard();}showPredict();}
  function predictHint(){if(answered||finished)return;predictHints++;el('predictFeedback').textContent=`Hint: Bubble Sort scans from left to right. This pass has ${end} comparisons; the next pair starts at position ${pos+1}.`;showPredict();el('predictFeedback').textContent=`Hint: the next comparison starts at position ${pos+1}.`;}
  el('puzzleNew').addEventListener('click',resetPuzzle);el('puzzleDifficulty').addEventListener('change',resetPuzzle);el('puzzleHint').addEventListener('click',puzzleHint);el('predictNew').addEventListener('click',newPredict);el('predictDifficulty').addEventListener('change',newPredict);el('predictHint').addEventListener('click',predictHint);el('predictNext').addEventListener('click',nextPredict);resetPuzzle();newPredict();dashboard();
})();
