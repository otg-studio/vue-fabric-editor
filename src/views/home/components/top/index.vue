<template>
  <Header>
    <div class="left">
      <logo></logo>
      <Divider type="vertical" />

      <!-- 导入 -->
      <import-Json></import-Json>
      <Divider type="vertical" />
      <import-file></import-file>
      <Divider type="vertical" />
      <Button type="text" to="/template" target="_blank">全部模板</Button>
      <Divider type="vertical" />
      <Button type="text" @click="batchGenerateRef?.open()">批次產圖</Button>
      <Divider type="vertical" />

      <myTemplName></myTemplName>
      <!-- 标尺开关 -->
      <Tooltip :content="$t('grid')">
        <iSwitch v-model="toggleModel" size="small" class="switch"></iSwitch>
      </Tooltip>
      <Divider type="vertical" />
      <history></history>
    </div>

    <div class="right">
      <a href="https://pro.kuaitu.cc/" target="_blank" alt="商业版">
        <img width="15" :src="proIcon" alt="vue-fbric-editor" />
      </a>
      <!-- 管理员模式 -->
      <admin />
      <!-- 预览 -->
      <previewCurrent />
      <waterMark />
      <save></save>
      <login></login>
      <lang></lang>
    </div>

    <batch-generate ref="batchGenerateRef" />
  </Header>
</template>

<script name="Top" setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import proIcon from '@/assets/icon/proIcon.png';
// 导入元素
const importJson = defineAsyncComponent(() => import('@/components/importJSON.vue'));
const importFile = defineAsyncComponent(() => import('@/components/importFile.vue'));
const batchGenerate = defineAsyncComponent(() => import('@/components/batchGenerate.vue'));

// 顶部组件
const logo = defineAsyncComponent(() => import('@/components/logo.vue'));
const myTemplName = defineAsyncComponent(() => import('@/components/myTemplName.vue'));
const previewCurrent = defineAsyncComponent(() => import('@/components/previewCurrent'));
const save = defineAsyncComponent(() => import('@/components/save.vue'));
const lang = defineAsyncComponent(() => import('@/components/lang.vue'));
const waterMark = defineAsyncComponent(() => import('@/components/waterMark.vue'));
const login = defineAsyncComponent(() => import('@/components/login'));
const admin = defineAsyncComponent(() => import('@/components/admin'));
const history = defineAsyncComponent(() => import('@/components/history.vue'));

const props = defineProps(['ruler']);
const emit = defineEmits(['update:ruler']);

const batchGenerateRef = ref<InstanceType<typeof batchGenerate> | null>(null);

const toggleModel = computed({
  get() {
    return props.ruler;
  },
  set(value) {
    emit('update:ruler', value);
  },
});
</script>

<style lang="less" scoped>
.left,
.right {
  display: flex;
  align-items: center;
  img {
    display: block;
    margin-right: 10px;
  }
}
</style>
