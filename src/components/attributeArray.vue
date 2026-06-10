<!--
 * @Description: 陣列複製功能
-->
<template>
  <div class="box attr-item-box" v-if="isOne">
    <Divider plain orientation="left"><h4>陣列複製</h4></Divider>
    <Row :gutter="10">
      <Col flex="1">
        <InputNumber v-model="count" :min="1" :max="50" :append="'次數'"></InputNumber>
      </Col>
      <Col flex="1">
        <InputNumber v-model="gap" :min="0" :append="'間距'"></InputNumber>
      </Col>
    </Row>
    <Button type="primary" long style="margin-top: 10px" @click="doArrayClone">水平排列複製</Button>
  </div>
</template>

<script setup name="AttributeArray">
import { ref } from 'vue';
import useSelect from '@/hooks/select';
import InputNumber from '@/components/inputNumber';
import { v4 as uuid } from 'uuid';

const { canvasEditor, isOne } = useSelect();
const count = ref(5);
const gap = ref(10);

const doArrayClone = () => {
  const canvas = canvasEditor.canvas;
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;

  const copies = count.value;
  const gapValue = gap.value;
  const keys = canvasEditor.getExtensionKey ? canvasEditor.getExtensionKey() : [];

  let currentIndex = 0;

  const cloneNext = (sourceObj, currentLeft) => {
    if (currentIndex >= copies) {
      canvas.requestRenderAll();
      return;
    }
    sourceObj.clone((cloned) => {
      // 確保 ID 唯一
      cloned.set({
        id: uuid(),
        left: currentLeft + gapValue,
        top: sourceObj.top,
        evented: true,
      });

      // 如果是群組，需要遞迴設定內部子元素的 ID
      if (cloned.type === 'activeSelection' || cloned.type === 'group') {
        cloned.forEachObject((obj) => {
          obj.id = uuid();
        });
      }

      canvas.add(cloned);

      // 繼續複製下一個，使用剛剛算出的 cloned.left 加上 cloned 的實際寬度
      currentIndex++;
      const nextLeft = cloned.left + cloned.getScaledWidth();
      cloneNext(sourceObj, nextLeft);
    }, keys);
  };

  const initialNextLeft = activeObject.left + activeObject.getScaledWidth();
  cloneNext(activeObject, initialNextLeft);
};
</script>

<style scoped lang="less">
:deep(.ivu-input-number) {
  display: block;
  width: 100%;
}
</style>
