import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import ViewUiPlus from 'view-ui-plus';
import 'view-ui-plus/dist/styles/viewuiplus.css';
import './styles/index.less';
import VueLazyLoad from 'vue3-lazyload';
// 自定义字体文件
// Removed import '@/assets/fonts/font.css';

import { VueMasonryPlugin } from 'vue-masonry';

import i18n from './language/index';

import { fabric } from 'fabric';

// 修復 fabric.js v5.x 版本的 'alphabetical' TextBaseline 錯誤警告
if (fabric && fabric.Text && fabric.Text.prototype) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  fabric.Text.prototype._setTextStyles = function (ctx: any, charStyle: any, forMeasuring: any) {
    ctx.textBaseline = 'alphabetic'; // 原本的原始碼寫錯成 'alphabetical'，這裡強制作修正
    if (this.path) {
      switch (this.pathAlign) {
        case 'center':
          ctx.textBaseline = 'middle';
          break;
        case 'ascender':
          ctx.textBaseline = 'top';
          break;
        case 'descender':
          ctx.textBaseline = 'bottom';
          break;
      }
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ctx.font = this._getFontDeclaration(charStyle, forMeasuring);
  };
}

async function bootstrap() {
  const app = createApp(App);
  app.use(VueMasonryPlugin);
  app.use(router);
  app.use(i18n);
  app.use(VueLazyLoad, {});
  app.use(ViewUiPlus);
  await router.isReady();
  app.mount('#app');
}
bootstrap();
