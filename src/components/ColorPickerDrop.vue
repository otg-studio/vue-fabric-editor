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

<style lang="less">
.color-picker-full {
  flex: 1;
  width: 100% !important;
  display: block !important;

  .ivu-color-picker-rel {
    width: 100% !important;
    display: block !important;
  }

  .ivu-input-wrapper {
    width: 100% !important;
  }

  .ivu-input {
    width: 100% !important;
    height: 32px !important;
    padding: 0 4px !important;
    cursor: pointer !important;
  }

  .ivu-color-picker-color {
    width: calc(100% - 8px) !important;
    height: 24px !important;
    display: block !important;
    margin-top: 3px !important;
    margin-left: 4px !important;
    div {
      width: 100% !important;
      height: 100% !important;
      border-radius: 2px !important;
    }
  }

  .ivu-icon-ios-arrow-down {
    display: none !important;
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
