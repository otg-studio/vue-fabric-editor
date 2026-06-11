<template>
  <Header class="header-container">
    <div class="left">
      <logo></logo>
      <Divider type="vertical" />

      <!-- 导入 -->
      <import-Json></import-Json>
      <Divider type="vertical" />
      <import-file></import-file>
      <Divider type="vertical" />
      <local-save></local-save>
      <Divider type="vertical" />
      <Button type="text" @click="batchGenerateRef?.open()">{{ $t('ui.batchGenerate') }}</Button>
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
      <!-- 管理员模式 -->
      <admin />
      <!-- 预览 -->
      <previewCurrent />
      <waterMark />
      <save></save>
      <lang></lang>
    </div>

    <batch-generate ref="batchGenerateRef" />
  </Header>
</template>

<script name="Top" setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ref,
  computed,
  defineAsyncComponent,
  inject,
  onMounted,
  onBeforeUnmount,
  watch,
} from 'vue';
// 导入元素
const importJson = defineAsyncComponent(() => import('@/components/importJSON.vue'));
const importFile = defineAsyncComponent(() => import('@/components/importFile.vue'));
const localSave = defineAsyncComponent(() => import('@/components/localSave.vue'));
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

const canvasEditor: any = inject('canvasEditor');

const handleOpenBatchGenerate = (data: any) => {
  if (batchGenerateRef.value) {
    batchGenerateRef.value.open(data);
  } else {
    // 透過 Vue 原生的 watch 完美監聽非同步元件的載入，不使用任何 timeout 寫死時間
    const unwatch = watch(batchGenerateRef, (newVal) => {
      if (newVal) {
        newVal.open(data);
        unwatch(); // 執行完就立刻解除監聽
      }
    });
  }
};

onMounted(() => {
  if (canvasEditor) {
    canvasEditor.on('openBatchGenerate', handleOpenBatchGenerate);
  }
});

onBeforeUnmount(() => {
  if (canvasEditor) {
    canvasEditor.off('openBatchGenerate', handleOpenBatchGenerate);
  }
});
</script>

<style lang="less" scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  width: 100%;
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: 8px;

  :deep(button),
  :deep(.ivu-btn) {
    font-size: 15px;
    padding: 6px 12px;
  }

  img {
    display: block;
  }
}
</style>
