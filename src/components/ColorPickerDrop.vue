<template>
  <div style="display: flex; align-items: center; gap: 8px; width: 100%">
    <ColorPicker
      v-model="internalValue"
      v-bind="$attrs"
      transfer
      @on-change="handleChange"
      class="color-picker-full"
    />
    <Tooltip content="吸管取色" v-if="hasEyeDrop" placement="top" transfer>
      <Icon
        type="md-color-filter"
        size="20"
        style="cursor: pointer; color: #666; vertical-align: middle"
        @click="openEyeDropper"
      />
    </Tooltip>
  </div>
</template>

<style scoped lang="less">
.color-picker-full {
  flex: 1;
  :deep(.ivu-select-dropdown) {
    /* ensure dropdown is normal */
  }
  :deep(.ivu-color-picker-rel) {
    width: 100%;
  }
  :deep(.ivu-color-picker-color) {
    width: 100%;
    height: 32px;
    display: block;
    div {
      width: 100%;
      height: 100%;
      border-radius: 4px;
    }
  }
}
</style>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'on-change']);

const internalValue = ref(props.modelValue);
const hasEyeDrop = 'EyeDropper' in window;

watch(
  () => props.modelValue,
  (val) => {
    internalValue.value = val;
  }
);

const handleChange = (val) => {
  emit('update:modelValue', val);
  emit('on-change', val);
};

const openEyeDropper = async () => {
  if (!window.EyeDropper) return;
  const eyeDropper = new window.EyeDropper();
  try {
    const result = await eyeDropper.open();
    let color = result.sRGBHex;
    // ColorPicker in view-ui-plus supports hex. If alpha is needed, it might need 8 chars.
    // We will just emit the picked hex color.
    // If the original value had alpha, preserve it as 'ff'
    if (props.modelValue && props.modelValue.length === 9) {
      color += 'ff';
    }
    internalValue.value = color;
    emit('update:modelValue', color);
    emit('on-change', color);
  } catch (e) {
    console.log('取消取色');
  }
};
</script>

<script>
export default {
  inheritAttrs: false,
};
</script>
