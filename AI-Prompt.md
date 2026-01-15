# GeoTikTrim-AI-Prompt

## 🎯 核心目标
您需要维护和扩展这个TikZ代码清理工具，它能将自动生成的TikZ代码转换为更简洁、可读的手写风格代码。

## 📋 现有功能概览

### 1. 基本框架
- **主要函数**：`cleanTikZCode(code)` - 主入口函数
- **处理流程**：
  1. 提取tikzpicture环境内容
  2. 解析各种图形元素
  3. 重新组织代码结构
  4. 输出格式化的简洁代码

### 2. 已支持的图形元素类型

#### 点相关
- **坐标点**：`\draw[fill=...] (x,y) circle (radius);`
- **点标签**：`\draw[color=...] (x,y) node {$label$};`
- **智能标签位置**：`getSmartLabelPosition()`函数根据点位置自动确定标签放置方向

#### 线相关
- **直线段**：`\draw[...] (x1,y1) -- (x2,y2);`
- **线型转换**：`convertLineStyle()`函数转换线型（实线、虚线、点线、点划线）

#### 函数图像
- **普通函数**：`\draw[...] plot(\x,{expression})`
- **二次函数**：`\draw[...] plot(\x,{(\x)^2/2/denominator})`
- **clip范围**：从`\clip`命令中提取

#### 圆与椭圆
- **几何圆**：`\draw[...] (center) circle (radius);`
- **椭圆**：`\draw[...] (center) ellipse (xRadius and yRadius);`
- **旋转处理**：支持`rotate around`选项

#### 圆弧与扇形
- **圆弧**：使用参数方程绘制的圆弧
- **扇形**：带`-- cycle`的扇形区域
- **角度标记**：带灰色填充的角度标记

#### 文本和角度标签
- **文本标签**：带定位选项的文本节点
- **角度标签**：度数标签（如`α = 64.94°`）

## 🔧 现有函数说明

### 关键工具函数
1. **`roundToThreeDecimals(num)`** - 四舍五入到三位小数

```javascript
function roundToThreeDecimals(num) {
                return Math.round(num * 1000) / 1000;
            }
```

1. **`formatCoordinate(coordStr, shouldRound)`** - 格式化坐标字符串

```javascript
function formatCoordinate(coordStr, shouldRound) {
                const match = coordStr.match(/\(([^,]+),([^)]+)\)/);
                if (!match) return coordStr;
                
                let x = parseFloat(match[1]);
                let y = parseFloat(match[2]);
                
                if (shouldRound) {
                    x = roundToThreeDecimals(x);
                    y = roundToThreeDecimals(y);
                }
                
                return `(${x},${y})`;
            }
```

1. **`convertLineStyle(style)`** - 转换线型描述

   ```javascript
   const convertLineStyle = (style) => {
                       if (!style) return '';
                       
                       let lineStyle = style.replace(/line width=[^,\]]+,?/g, '');
                       lineStyle = lineStyle.replace(/,\s*$/g, '');
                       lineStyle = lineStyle.replace(/\[\s*,\s*/g, '[');
                       
                       if (lineStyle.includes('dash pattern=on 1pt off 1pt on 1pt off 4pt')) {
                           return 'dash dot';
                       } else if (lineStyle.includes('dash pattern=on 1pt off 1pt')) {
                           return 'dashed';
                       } else if (lineStyle.includes('dotted')) {
                           return 'dotted';
                       } else if (lineStyle.includes('dash')) {
                           return 'dashed';
                       }
                       
                       return '';
                   };
   ```

2. **`getSmartLabelPosition(x, y, allPoints)`** - 智能标签位置计算

### 提取函数
1. **`extractQuadraticFunctions(code)`** - 提取二次函数图像

1. **`extractFunctionPlots(code)`** - 提取普通函数图像

## 🆕 如何添加新的过滤规则

### 步骤1：识别新元素类型
当需要添加对新图形元素的支持时：

1. **分析原始TikZ代码模式**
   ```javascript
   // 示例：识别新的图形元素
   const newElementRegex = /\\newElement\s*\[([^\]]*)\]\s*pattern.../g;
   ```

2. **确定关键信息**
   - 元素类型（线、填充区域、标记等）
   - 必需的几何参数
   - 样式属性（颜色、线型、填充等）

### 步骤2：创建提取函数

```javascript
function extractNewElement(code) {
    try {
        const regex = /.../g;  // 新元素的正则表达式
        const matches = [...code.matchAll(regex)];
        const elements = [];
        
        matches.forEach(match => {
            // 解析参数
            const param1 = match[1];
            const param2 = match[2];
            // ...
            
            // 应用四舍五入（如果需要）
            if (shouldRound) {
                // 处理数值参数
            }
            
            elements.push({
                original: match[0],
                // 解析后的属性
                property1: value1,
                property2: value2,
                // ...
            });
        });
        
        return {
            hasNewElement: elements.length > 0,
            elements: elements
        };
    } catch (error) {
        console.error('提取新元素出错:', error);
        return { hasNewElement: false, elements: [] };
    }
}
```

### 步骤3：集成到主处理流程

1. **在`cleanTikZCode`函数中添加提取调用**
   ```javascript
   const newElementResult = extractNewElement(code);
   ```

2. **添加到结果输出部分**
   ```javascript
   if (newElementResult.hasNewElement) {
       result += '  % 新元素\n';
       newElementResult.elements.forEach(element => {
           // 生成简洁的TikZ代码
           result += `  \\draw[...] ...;\n`;
       });
   }
   ```

### 步骤4：处理注意事项

1. **坐标四舍五入**
   - 使用`roundToThreeDecimals()`处理数值
   - 通过`shouldRound`标志控制

2. **标签映射**
   - 尽可能使用坐标点标签（如`(A)`而不是`(1.23,4.56)`）
   - 在`pointMap`中查找坐标对应的标签

3. **样式转换**
   - 使用`convertLineStyle()`统一线型描述
   - 保持与现有样式的一致性

4. **代码组织**
   - 按逻辑分组输出（点、线、面、标记等）
   - 添加适当的注释说明

## 📝 扩展示例模板

```javascript
// 示例：添加对新图形元素的支持

// 1. 定义提取函数
function extractCustomShape(code) {
    const customRegex = /\\draw\s*\[([^\]]*)\]\s*customShape\s*\(([^)]+)\)\s*--\s*cycle;/g;
    const matches = [...code.matchAll(customRegex)];
    const shapes = [];
    
    const shouldRound = roundCoordinates.checked;
    
    matches.forEach(match => {
        const options = match[1];
        const points = match[2].split('--').map(coord => coord.trim());
        
        // 格式化点坐标
        const formattedPoints = points.map(coord => {
            return formatCoordinate(`(${coord})`, shouldRound);
        });
        
        // 转换线型
        const lineStyle = convertLineStyle(options);
        
        shapes.push({
            original: match[0],
            points: formattedPoints,
            lineStyle: lineStyle,
            // 其他属性...
        });
    });
    
    return {
        hasCustomShape: shapes.length > 0,
        shapes: shapes
    };
}

// 2. 在主函数中集成
// 在cleanTikZCode函数中添加：
// const customShapeResult = extractCustomShape(code);

// 3. 在输出部分添加：
// if (customShapeResult.hasCustomShape) {
//     result += '  % 自定义形状\n';
//     customShapeResult.shapes.forEach(shape => {
//         const pointsStr = shape.points.join(' -- ');
//         if (shape.lineStyle) {
//             result += `  \\draw[${shape.lineStyle}] ${pointsStr} -- cycle;\n`;
//         } else {
//             result += `  \\draw ${pointsStr} -- cycle;\n`;
//         }
//     });
//     result += '\n';
// }
```

## 🚨 重要提醒

1. **正则表达式安全性**：确保正则表达式能正确处理边缘情况
2. **错误处理**：每个提取函数都应有try-catch块
3. **性能考虑**：避免在循环中进行复杂的DOM操作或字符串处理
4. **代码可读性**：保持与现有代码风格一致
5. **向后兼容**：新功能不应破坏现有的处理逻辑

## 📊 调试建议

1. 使用`console.log()`输出中间结果
2. 测试各种边界情况（空输入、异常格式、特殊字符）
3. 验证输出代码在LaTeX中能正确编译
4. 确保四舍五入不会导致几何关系错误

## 🔍 未来可能扩展方向

1. **更多曲线类型**：贝塞尔曲线、样条曲线
2. **填充模式**：图案填充、渐变填充
3. **箭头和标记**：不同类型的箭头头部
4. **3D图形**：简单的三维投影
5. **动画元素**：时间线标记

---

**使用此提示词时**：当需要添加新的TikZ元素支持时，参考这个指南的结构和模式，确保新功能与现有框架无缝集成。