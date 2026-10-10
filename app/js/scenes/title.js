// タイトル: 氷でできた大きな年齢の数字と、ティアラ、名前

import { bigNumberSVG, tiaraSVG, ribbonSVG, castleSVG, hillsSVG, snowmanSVG, snowflakeSVG } from '../art/svg.js';
import { ICON } from '../art/icons.js';
import { $, puffy, centerOf } from '../ui.js';
import { countPhotos } from '../store/photos.js';

export function createTitle(app) {
  const root = $('#scene-title');
  const numEl = $('[data-art="bignum"]', root);
  const nameEl = $('#title-name');
  const sai = $('.sai', root);
  const ribbonEl = $('[data-art="ribbon"]', root);
  const hint = $('#parent-hint');
  const startBtn = $('#btn-start');
  const gear = $('#gear');

  $('[data-art="tiara"]', root).innerHTML = tiaraSVG();
  $('[data-art="castle"]', root).innerHTML = castleSVG();
  $('[data-art="hills"]', root).innerHTML = hillsSVG();
  $('[data-art="snowman"]', root).innerHTML = snowmanSVG();
  startBtn.querySelector('.ico').innerHTML = snowflakeSVG(0);
  gear.insertAdjacentHTML('afterbegin', ICON.gear);

  startBtn.addEventListener('click', () => {
    app.unlock();
    app.go('cake', centerOf(startBtn));
  });

  // 子どもが触っても開かないよう、⚙ は長押しで開く（キーボードは Enter で開く）
  let pressTimer = 0;
  const cancelPress = () => {
    clearTimeout(pressTimer);
    gear.classList.remove('pressing');
  };
  gear.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    gear.classList.add('pressing');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      gear.classList.remove('pressing');
      app.unlock();
      app.openSettings();
    }, 750);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => gear.addEventListener(t, cancelPress));
  gear.addEventListener('contextmenu', (e) => e.preventDefault());
  gear.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      app.openSettings();
    }
  });

  async function render() {
    const s = app.settings;
    numEl.innerHTML = bigNumberSVG(s.age);
    puffy(nameEl, s.name);
    puffy(sai, 'さい', 'ice');
    ribbonEl.innerHTML = ribbonSVG('おたんじょうび おめでとう');
    document.title = `${s.name}の おたんじょうび`;
    hint.hidden = (await countPhotos()) > 0;
  }

  return {
    render,
    enter() {
      render();
      app.keepAwake(false);
    },
    exit() {},
  };
}
