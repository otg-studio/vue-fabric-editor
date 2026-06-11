<!--
 * @Author: 秦少卫
 * @Date: 2024-05-21 10:18:57
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-10-07 17:35:31
 * @Description: 圆角
-->
<template>
  <div class="box attr-item-box" v-if="isOne && isMatchType">
    <!-- <h3>圆角</h3> -->
    <Divider plain orientation="left">
      <h4>{{ $t('attributes.rounded') }}</h4>
    </Divider>
    <!-- 通用属性 -->
    <div>
      <Row :gutter="10">
        <Col :span="18" flex="1">
          <Form :label-width="40" class="form-wrap">
            <FormItem :label="$t('attributes.rx_ry')">
              <Slider
                v-model="baseAttr.roundValue"
                :max="300"
                @on-input="(value) => changeCommon(value)"
              ></Slider>
            </FormItem>
          </Form>
        </Col>
        <Col :span="6" flex="1">
          <InputNumber
            v-model="baseAttr.roundValue"
            :min="0"
            :max="300"
            @on-change="(value) => changeCommon(value)"
          ></InputNumber>
        </Col>
      </Row>
    </div>
    <!-- <Divider plain></Divider> -->
  </div>
</template>

<script setup name="AttrBute">
import useSelect from '@/hooks/select';

const update = getCurrentInstance();
const { canvasEditor, isOne, isMatchType, fabric } = useSelect(['rect', 'image']);

// 属性值
const baseAttr = reactive({
  roundValue: 0,
});

// 属性获取
const getObjectAttr = (e) => {
  const activeObject = canvasEditor.canvas.getActiveObject();
  // 不是当前obj，跳过
  if (e && e.target && e.target !== activeObject) return;
  if (activeObject) {
    baseAttr.roundValue = activeObject.get('roundValue');
  }
};

// 通用属性改变
const changeCommon = (value) => {
  const activeObject = canvasEditor.canvas.getActiveObjects()[0];
  if (activeObject) {
    if (activeObject.type === 'image') {
      activeObject.set('roundValue', value);
      if (value > 0) {
        // 建立矩形遮罩來實現圓角
        // 由於 clipPath 會跟著 activeObject 一起被 scale，
        // 為了讓視覺上的圓角半徑 = value，我們必須除以 scaleX / scaleY
        const scaleX = activeObject.get('scaleX') || 1;
        const scaleY = activeObject.get('scaleY') || 1;

        const w = activeObject.width;
        const h = activeObject.height;
        const rx = Math.max(0, Math.round(Number(value) / scaleX));
        const ry = Math.max(0, Math.round(Number(value) / scaleY));

        const x = -w / 2;
        const y = -h / 2;
        const r1 = Math.min(rx, w / 2);
        const r2 = Math.min(ry, h / 2);

        // 使用 Path 繪製圓角矩形，完全避開 fabric.Rect 的 rx/ry 當 clipPath 時可能失效的問題
        const pathString = `
          M ${x + r1} ${y}
          L ${x + w - r1} ${y}
          A ${r1} ${r2} 0 0 1 ${x + w} ${y + r2}
          L ${x + w} ${y + h - r2}
          A ${r1} ${r2} 0 0 1 ${x + w - r1} ${y + h}
          L ${x + r1} ${y + h}
          A ${r1} ${r2} 0 0 1 ${x} ${y + h - r2}
          L ${x} ${y + r2}
          A ${r1} ${r2} 0 0 1 ${x + r1} ${y}
          Z
        `
          .trim()
          .replace(/\s+/g, ' ');

        const rect = new fabric.Path(pathString, {
          originX: 'center',
          originY: 'center',
          left: 0,
          top: 0,
          fill: '#000000',
          absolutePositioned: false,
        });

        activeObject.set('clipPath', rect);
        activeObject.set('dirty', true);
      } else {
        activeObject.set('clipPath', null);
      }
    } else {
      activeObject.set('ry', value);
      activeObject.set('rx', value);
      activeObject.set('roundValue', value);
    }
    canvasEditor.canvas.requestRenderAll();
  }
};

const selectCancel = () => {
  update?.proxy?.$forceUpdate();
};

onMounted(() => {
  // 获取圆角数据
  getObjectAttr();
  canvasEditor.on('selectCancel', selectCancel);
  canvasEditor.on('selectOne', getObjectAttr);
  canvasEditor.canvas.on('object:modified', getObjectAttr);
});

onBeforeUnmount(() => {
  canvasEditor.off('selectCancel', selectCancel);
  canvasEditor.off('selectOne', getObjectAttr);
  canvasEditor.canvas.off('object:modified', getObjectAttr);
});
</script>

<style scoped lang="less">
:deep(.ivu-input-number) {
  display: block;
  width: 100%;
}

:deep(.ivu-color-picker) {
  display: block;
}
.ivu-row {
  margin-bottom: 8px;
  .ivu-col {
    position: inherit;
    &__box {
      display: flex;
      align-items: center;
      background: #f8f8f8;
      border-radius: 4px;
      gap: 8px;
    }
  }

  .label {
    padding-left: 8px;
  }
  .content {
    flex: 1;
    :deep(.--input),
    :deep(.ivu-select-selection) {
      background-color: transparent;
      border: none !important;
      box-shadow: none !important;
    }
  }
}
</style>
