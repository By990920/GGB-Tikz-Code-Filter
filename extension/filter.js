/**
 * filter.js — GeoGebra TikZ 代码过滤核心逻辑
 *
 * 从 GeoTikTrim 项目中提取，改造为纯函数。
 * 挂载到 window.filterTikzCode(code, settings)
 *
 * settings 结构：
 *   { includePoints: bool, includeLabels: bool, roundCoordinates: bool }
 */

(function () {
  'use strict';

  /**
   * 四舍五入到三位小数
   */
  function roundToThreeDecimals(num) {
    return Math.round(num * 1000) / 1000;
  }

  /**
   * 格式化坐标字符串，可选四舍五入
   */
  function formatCoordinate(coordStr, shouldRound) {
    var match = coordStr.match(/\(([^,]+),([^)]+)\)/);
    if (!match) return coordStr;

    var x = parseFloat(match[1]);
    var y = parseFloat(match[2]);

    if (shouldRound) {
      x = roundToThreeDecimals(x);
      y = roundToThreeDecimals(y);
    }

    return '(' + x + ',' + y + ')';
  }

  /**
   * 智能标签位置计算
   * 根据点在所有点中的相对位置，决定标签放置方向
   */
  function getSmartLabelPosition(x, y, allPoints) {
    var xCoords = allPoints.map(function (p) { return p.x; });
    var yCoords = allPoints.map(function (p) { return p.y; });
    var minX = Math.min.apply(null, xCoords);
    var maxX = Math.max.apply(null, xCoords);
    var minY = Math.min.apply(null, yCoords);
    var maxY = Math.max.apply(null, yCoords);
    var centerX = (minX + maxX) / 2;
    var centerY = (minY + maxY) / 2;

    var position = 'above';

    if (Math.abs(x - minX) < 0.1) {
      position = 'left';
    } else if (Math.abs(x - maxX) < 0.1) {
      position = 'right';
    } else if (Math.abs(y - minY) < 0.1) {
      position = 'below';
    } else if (Math.abs(y - maxY) < 0.1) {
      position = 'above';
    } else {
      if (x > centerX && y > centerY) {
        position = 'above right';
      } else if (x > centerX && y <= centerY) {
        position = 'below right';
      } else if (x <= centerX && y > centerY) {
        position = 'above left';
      } else {
        position = 'below left';
      }
    }

    return position;
  }

  /**
   * 线型转换：GeoGebra → TikZ 标准线型
   */
  function convertLineStyle(style) {
    if (!style) return '';

    var lineStyle = style.replace(/line width=[^,\]]+,?/g, '');
    lineStyle = lineStyle.replace(/,\s*$/g, '');
    lineStyle = lineStyle.replace(/\[\s*,\s*/g, '[');

    if (lineStyle.indexOf('dash pattern=on 1pt off 1pt on 1pt off 4pt') !== -1) {
      return 'dash dot';
    } else if (lineStyle.indexOf('dash pattern=on 1pt off 1pt') !== -1) {
      return 'dashed';
    } else if (lineStyle.indexOf('dotted') !== -1) {
      return 'dotted';
    } else if (lineStyle.indexOf('dash') !== -1) {
      return 'dashed';
    }

    return '';
  }

  /**
   * 提取二次函数图像
   */
  function extractQuadraticFunctions(code, shouldRound) {
    try {
      var quadraticRegex = /\\draw\s*\[([^\]]+)\]\s*plot\s*\(\\x,\{\(\\x\)\^2\/2\/([^}]+)\}\)/g;
      var quadraticMatches = [];
      var m;
      while ((m = quadraticRegex.exec(code)) !== null) {
        quadraticMatches.push(m);
      }
      var quadraticFunctions = [];

      quadraticMatches.forEach(function (match) {
        var options = match[1];
        var denominator = match[2];

        var samplesMatch = options.match(/samples=(\d+)/);
        var rotateMatch = options.match(/rotate around=\{([^:]+):\(([^,]+),([^)]+)\)\}/);
        var xshiftMatch = options.match(/xshift=([^,]+)cm/);
        var yshiftMatch = options.match(/yshift=([^,]+)cm/);
        var domainMatch = options.match(/domain=([^:]+):([^)]+)\)?/);

        if (domainMatch) {
          var angle = '0';
          var centerX = '0';
          var centerY = '0';

          if (rotateMatch) {
            angle = rotateMatch[1];
            centerX = rotateMatch[2];
            centerY = rotateMatch[3];
          }

          var xshift = '0';
          var yshift = '0';

          if (xshiftMatch) xshift = xshiftMatch[1];
          if (yshiftMatch) yshift = yshiftMatch[1];

          var domainStart = domainMatch[1];
          var domainEnd = domainMatch[2];

          if (domainEnd.indexOf(')') !== -1) {
            domainEnd = domainEnd.replace(')', '');
          }

          if (shouldRound) {
            if (centerX !== '0') centerX = roundToThreeDecimals(parseFloat(centerX));
            if (centerY !== '0') centerY = roundToThreeDecimals(parseFloat(centerY));
            if (xshift !== '0') xshift = roundToThreeDecimals(parseFloat(xshift));
            if (yshift !== '0') yshift = roundToThreeDecimals(parseFloat(yshift));
            denominator = roundToThreeDecimals(parseFloat(denominator));
            domainStart = roundToThreeDecimals(parseFloat(domainStart));
            domainEnd = roundToThreeDecimals(parseFloat(domainEnd));
            xshift += 'cm';
            yshift += 'cm';
          }

          var newOptions = 'smooth,samples=500';

          if (rotateMatch) {
            newOptions += ',rotate around={' + angle + ':(' + centerX + ',' + centerY + ')}';
          }

          if ((xshiftMatch && xshift !== '0cm') || (yshiftMatch && yshift !== '0cm')) {
            newOptions += ',xshift=' + xshift + ',yshift=' + yshift;
          }

          newOptions += ',domain=' + domainStart + ':' + domainEnd;

          quadraticFunctions.push({
            original: match[0],
            options: newOptions,
            expression: '(\\x)^2/2/' + denominator
          });
        }
      });

      return {
        hasQuadratic: quadraticFunctions.length > 0,
        quadraticFunctions: quadraticFunctions
      };
    } catch (error) {
      console.error('提取二次函数出错:', error);
      return { hasQuadratic: false, quadraticFunctions: [] };
    }
  }

  /**
   * 提取函数图像（含 scope 裁剪）
   */
  function extractFunctionPlots(code, shouldRound) {
    try {
      var clipRegex = /\\clip\(([^,]+),([^)]+)\)\s*rectangle\s*\(([^,]+),([^)]+)\);/;
      var clipMatch = code.match(clipRegex);

      if (!clipMatch) {
        throw new Error('未找到clip范围定义');
      }

      var clipX1 = shouldRound ? roundToThreeDecimals(parseFloat(clipMatch[1])) : parseFloat(clipMatch[1]);
      var clipY1 = shouldRound ? roundToThreeDecimals(parseFloat(clipMatch[2])) : parseFloat(clipMatch[2]);
      var clipX2 = shouldRound ? roundToThreeDecimals(parseFloat(clipMatch[3])) : parseFloat(clipMatch[3]);
      var clipY2 = shouldRound ? roundToThreeDecimals(parseFloat(clipMatch[4])) : parseFloat(clipMatch[4]);

      var functionPlotRegex = /\\draw\[([^\]]*)\]\s*plot\s*\(\\x,\{([^}]*)\}\)/g;
      var functionMatches = [];
      var m;
      while ((m = functionPlotRegex.exec(code)) !== null) {
        functionMatches.push(m);
      }
      var functions = [];

      var containsLnRegex = /ln\s*\(/i;

      functionMatches.forEach(function (match) {
        var options = match[1];
        var functionExpression = match[2];

        var domainRegex = /domain=([^:]+):([^,\]]+)/;
        var domainMatch = options.match(domainRegex);

        if (domainMatch) {
          var domainStart = domainMatch[1];
          var domainEnd = domainMatch[2];

          if (containsLnRegex.test(functionExpression)) {
            var startNum = parseFloat(domainStart);
            if (Math.abs(startNum) < 0.001) {
              domainStart = '0.001';
            }
          }

          if (shouldRound) {
            var startNum = parseFloat(domainStart);
            var endNum = parseFloat(domainEnd);
            if (!isNaN(startNum)) domainStart = roundToThreeDecimals(startNum).toString();
            if (!isNaN(endNum)) domainEnd = roundToThreeDecimals(endNum).toString();
          }

          var lineStyle = '';
          if (options.indexOf('dash pattern=on 1pt off 1pt on 1pt off 4pt') !== -1) {
            lineStyle = 'dash dot';
          } else if (options.indexOf('dash pattern=on 1pt off 1pt') !== -1) {
            lineStyle = 'dashed';
          } else if (options.indexOf('dotted') !== -1) {
            lineStyle = 'dotted';
          }

          var newOptions = 'smooth,samples=500';
          if (lineStyle) {
            newOptions = lineStyle + ',' + newOptions;
          }

          functions.push({
            original: match[0],
            options: newOptions,
            domainStart: domainStart,
            domainEnd: domainEnd,
            expression: functionExpression,
            lineStyle: lineStyle
          });
        }
      });

      var quadraticResult = extractQuadraticFunctions(code, shouldRound);

      var result = '  \\begin{scope}\n';
      result += '    \\clip(' + clipX1 + ',' + clipY1 + ') rectangle (' + clipX2 + ',' + clipY2 + ');\n';

      functions.forEach(function (func) {
        result += '    \\draw[' + func.options + ',domain=' + func.domainStart + ':' + func.domainEnd + '] plot(\\x,{' + func.expression + '});\n';
      });

      if (quadraticResult.hasQuadratic) {
        quadraticResult.quadraticFunctions.forEach(function (quad) {
          result += '    \\draw[' + quad.options + '] plot(\\x,{' + quad.expression + '});\n';
        });
      }

      result += '  \\end{scope}\n';

      return {
        hasFunctions: functions.length > 0 || quadraticResult.hasQuadratic,
        scopeCode: result,
        clipArea: '(' + clipX1 + ',' + clipY1 + ') rectangle (' + clipX2 + ',' + clipY2 + ')',
        normalFunctionCount: functions.length,
        quadraticFunctionCount: quadraticResult.quadraticFunctions.length
      };
    } catch (error) {
      console.error('提取函数图像出错:', error);
      return { hasFunctions: false, scopeCode: '', clipArea: '', normalFunctionCount: 0, quadraticFunctionCount: 0 };
    }
  }

  /**
   * 提取贝塞尔曲线（参数方程）
   */
  function extractParametricPlots(code, shouldRound) {
    try {
      var parametricRegex = /\\draw\[([^\]]*)\]\s*plot\[parametric\]\s*function\{([^}]+)\};/g;
      var matches = [];
      var m;
      while ((m = parametricRegex.exec(code)) !== null) {
        matches.push(m);
      }
      var plots = [];

      matches.forEach(function (match) {
        var options = match[1];
        var functionStr = match[2];

        var commaMatch = functionStr.match(/([^,]+),([^,]+)/);
        if (!commaMatch) return;

        var xExpr = commaMatch[1].trim();
        var yExpr = commaMatch[2].trim();

        if (shouldRound) {
          xExpr = xExpr.replace(/(\d+\.\d{4,})/g, function (num) {
            return roundToThreeDecimals(parseFloat(num)).toString();
          });
          yExpr = yExpr.replace(/(\d+\.\d{4,})/g, function (num) {
            return roundToThreeDecimals(parseFloat(num)).toString();
          });
        }

        xExpr = xExpr.replace(/t\*\*\((\d+)\)/g, '\\t^$1');
        xExpr = xExpr.replace(/\(1-t\)\*\*\((\d+)\)/g, '(1-\\t)^$1');
        yExpr = yExpr.replace(/t\*\*\((\d+)\)/g, '\\t^$1');
        yExpr = yExpr.replace(/\(1-t\)\*\*\((\d+)\)/g, '(1-\\t)^$1');

        xExpr = xExpr.replace(/([ (+\-*/,])t(?!\w)/g, '$1\\t');
        yExpr = yExpr.replace(/([ (+\-*/,])t(?!\w)/g, '$1\\t');
        xExpr = xExpr.replace(/^t(?!\w)/, '\\t');
        yExpr = yExpr.replace(/^t(?!\w)/, '\\t');

        var lineStyle = convertLineStyle(options);

        plots.push({
          original: match[0],
          options: options,
          xExpression: xExpr,
          yExpression: yExpr,
          lineStyle: lineStyle
        });
      });

      return {
        hasParametricPlots: plots.length > 0,
        plots: plots
      };
    } catch (error) {
      console.error('提取贝塞尔曲线出错:', error);
      return { hasParametricPlots: false, plots: [] };
    }
  }

  /**
   * 核心过滤函数
   * @param {string} code 原始 TikZ 代码
   * @param {Object} settings 过滤选项
   * @param {boolean} settings.includePoints 是否保留点标记
   * @param {boolean} settings.includeLabels 是否保留点标签
   * @param {boolean} settings.roundCoordinates 是否四舍五入坐标
   * @returns {string} 过滤后的 TikZ 代码
   */
  function cleanTikZCode(code, settings) {
    var includePoints = settings.includePoints !== false;
    var includeLabels = settings.includeLabels !== false;
    var shouldRound = settings.roundCoordinates !== false;

    try {
      var tikzMatch = code.match(/\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/);
      if (!tikzMatch) {
        throw new Error('未找到tikzpicture环境');
      }

      // 点的匹配
      var pointRegex = /\\draw\s*\[fill=[^\]]+\]\s*\(([^)]+)\)\s*circle\s*\(([^)]+)\);/g;
      var nodeRegex = /\\draw\[color=[^\]]+\]\s*\([^)]+\)\s*node\s*\{\$(?!.*\\textrm\{\\degre\})([^$]+(?:\{[^}]*\})?[^$]*)\$\}/g;

      var pointMap = new Map();
      var pointMatches = [];
      var nodeMatches = [];
      var pm;
      while ((pm = pointRegex.exec(code)) !== null) { pointMatches.push(pm); }
      var nm;
      while ((nm = nodeRegex.exec(code)) !== null) { nodeMatches.push(nm); }

      var allPoints = [];
      pointMatches.forEach(function (match) {
        var coords = match[1];
        var formattedCoords = formatCoordinate('(' + coords + ')', shouldRound);
        allPoints.push({
          original: coords,
          formatted: formattedCoords.slice(1, -1)
        });
      });

      allPoints.forEach(function (point, index) {
        if (index < nodeMatches.length) {
          var label = nodeMatches[index][1];
          pointMap.set(label, point.formatted);
        }
      });

      // 函数图像
      var functionPlotsResult = extractFunctionPlots(code, shouldRound);

      // 贝塞尔曲线
      var parametricPlotResult = extractParametricPlots(code, shouldRound);

      // 文本标签
      var textLabelRegex = /\\draw\s*\(([^)]+)\)\s*node\s*\[([^\]]+)\]\s*\{([^}]+)\};/g;
      var textLabelMatches = [];
      var tlm;
      while ((tlm = textLabelRegex.exec(code)) !== null) { textLabelMatches.push(tlm); }
      var textLabels = [];

      textLabelMatches.forEach(function (match) {
        var coords = match[1];
        var options = match[2];
        var content = match[3];
        var formattedCoords = formatCoordinate('(' + coords + ')', shouldRound);
        textLabels.push({ original: match[0], coords: formattedCoords, options: options, content: content });
      });

      // 角度标签
      var angleLabelRegex = /\\draw\[color=([^\]]+)\]\s*\(([^)]+)\)\s*node\s*\{\$([^}]+)\\textrm\{\\degre\}\$\};/g;
      var angleLabelMatches = [];
      var alm;
      while ((alm = angleLabelRegex.exec(code)) !== null) { angleLabelMatches.push(alm); }
      var angleLabels = [];

      angleLabelMatches.forEach(function (match) {
        var color = match[1];
        var coords = match[2];
        var content = match[3];
        var formattedCoords = formatCoordinate('(' + coords + ')', shouldRound);
        angleLabels.push({ original: match[0], color: color, coords: formattedCoords, content: content });
      });

      // 线段
      var lineRegex = /\\draw\s*(\[[^\]]+\])?\s*\(([^)]+)\)\s*--\s*\(([^)]+)\);/g;
      var lineMatches = [];
      var lm;
      while ((lm = lineRegex.exec(code)) !== null) { lineMatches.push(lm); }

      // 圆
      var circleRegex = /\\draw\s*\[([^\]]*line[^\]]*)\]\s*\(([^)]+)\)\s*circle\s*\(([^)]+)\);/g;
      var circleMatches = [];
      var cm;
      while ((cm = circleRegex.exec(code)) !== null) { circleMatches.push(cm); }
      var circles = [];

      circleMatches.forEach(function (match) {
        var options = match[1];
        var centerCoords = match[2];
        var radius = match[3];
        var formattedCenter = formatCoordinate('(' + centerCoords + ')', shouldRound);
        var lineStyle = convertLineStyle(options);
        var centerLabel = null;

        pointMap.forEach(function (coords, label) {
          var coordStr = coords.indexOf('(') !== -1 ? coords : '(' + coords + ')';
          if (coordStr.indexOf(centerCoords.trim()) !== -1 || formattedCenter.indexOf(coords) !== -1) {
            centerLabel = label;
          }
        });

        circles.push({
          center: centerLabel ? '(' + centerLabel + ')' : formattedCenter,
          radius: shouldRound ? roundToThreeDecimals(parseFloat(radius)) + (radius.indexOf('cm') !== -1 ? 'cm' : '') : radius,
          originalCenter: centerCoords,
          lineStyle: lineStyle
        });
      });

      // 圆弧
      var arcRegex = /\\draw\s*(\[[^\]]*\])?\s*plot\[domain=([^:]+):([^,]+),variable=\\t\]\(\{1\*([^\*]+)\*cos\(\\t r\)\+0\*[^\*]+\*sin\(\\t r\)\},\{0\*[^\*]+\*cos\(\\t r\)\+1\*[^\*]+\*sin\(\\t r\)\}\);/g;
      var arcMatches = [];
      var am;
      while ((am = arcRegex.exec(code)) !== null) { arcMatches.push(am); }
      var arcs = [];

      arcMatches.forEach(function (match) {
        var style = match[1] || '';
        var startAngle = match[2];
        var endAngle = match[3];
        var radius = match[4];

        var roundValue = function (val) {
          return shouldRound ? roundToThreeDecimals(parseFloat(val)) : val;
        };

        var lineStyle = '';
        if (style.indexOf('dash pattern=on 1pt off 1pt on 1pt off 4pt') !== -1) {
          lineStyle = 'dash dot';
        } else if (style.indexOf('dash pattern=on 1pt off 1pt') !== -1) {
          lineStyle = 'dashed';
        } else if (style.indexOf('dotted') !== -1) {
          lineStyle = 'dotted';
        }

        var shiftRegex = /shift=\{\(([^,]+),([^)]+)\)\}/;
        var shiftMatch = style.match(shiftRegex);

        var newStyle = '[';
        var styleParts = [];

        if (lineStyle) styleParts.push(lineStyle);

        if (shiftMatch) {
          var shiftX = roundValue(shiftMatch[1]);
          var shiftY = roundValue(shiftMatch[2]);
          styleParts.push('shift={(' + shiftX + ',' + shiftY + ')}');
        }

        styleParts.push('smooth');

        if (styleParts.length > 0) {
          newStyle += styleParts.join(', ') + ']';
        } else {
          newStyle = '';
        }

        arcs.push({
          style: newStyle,
          startAngle: roundValue(startAngle),
          endAngle: roundValue(endAngle),
          radius: roundValue(radius)
        });
      });

      // 扇形
      var sectorRegex = /\\draw\s*\[shift=\{\(([^,]+),([^)]+)\)\}[^\]]*\]\s*\(0,0\)\s*--\s*plot\[domain=([^:]+):([^,\]]+),variable=\\t\]\(\{1\*([^\*]+)\*cos\(\\t r\)\+0\*[^\*]+\*sin\(\\t r\)\},\{0\*[^\*]+\*cos\(\\t r\)\+1\*[^\*]+\*sin\(\\t r\)\}\)\s*--\s*cycle\s*;/g;
      var sectorMatches = [];
      var sm;
      while ((sm = sectorRegex.exec(code)) !== null) { sectorMatches.push(sm); }
      var sectors = [];

      sectorMatches.forEach(function (match) {
        var shiftX = match[1].trim();
        var shiftY = match[2].trim();
        var startAngle = match[3].trim();
        var endAngle = match[4].trim();
        var radius = match[5].trim();
        var style = match[0].match(/\\draw\s*\[([^\]]+)\]/)[1];
        var lineStyle = convertLineStyle(style);

        var roundValue = function (val) {
          return shouldRound ? roundToThreeDecimals(parseFloat(val)) : val;
        };

        sectors.push({
          shiftX: roundValue(shiftX),
          shiftY: roundValue(shiftY),
          startAngle: roundValue(startAngle),
          endAngle: roundValue(endAngle),
          radius: roundValue(radius),
          lineStyle: lineStyle
        });
      });

      // 椭圆
      var ellipseRegex = /\\draw\s*\[([^\]]*)\]\s*\(([^)]+)\)\s*ellipse\s*\(([^)]+)\);/g;
      var ellipseMatches = [];
      var em;
      while ((em = ellipseRegex.exec(code)) !== null) { ellipseMatches.push(em); }
      var ellipses = [];

      ellipseMatches.forEach(function (match) {
        var options = match[1];
        var centerCoords = match[2];
        var radii = match[3];

        var radiusParts = radii.split(' and ');
        var xRadiusStr = (radiusParts[0] || '').trim();
        var yRadiusStr = (radiusParts[1] || '').trim();

        var formattedCenter = formatCoordinate('(' + centerCoords + ')', shouldRound);

        var centerLabel = null;
        pointMap.forEach(function (coords, label) {
          var coordStr = coords.indexOf('(') !== -1 ? coords : '(' + coords + ')';
          if (coordStr.indexOf(centerCoords.trim()) !== -1 || formattedCenter.indexOf(coords) !== -1) {
            centerLabel = label;
          }
        });

        var rotationAngle = 0;
        var rotationCenter = null;
        var rotateMatch = options.match(/rotate around=\{([^:]+):\(([^)]+)\)\}/);

        if (rotateMatch) {
          rotationAngle = parseFloat(rotateMatch[1]);
          if (shouldRound) rotationAngle = roundToThreeDecimals(rotationAngle);

          var rotateCenterCoords = rotateMatch[2];
          var formattedRotateCenter = formatCoordinate('(' + rotateCenterCoords + ')', shouldRound);

          pointMap.forEach(function (coords, label) {
            var coordStr = coords.indexOf('(') !== -1 ? coords : '(' + coords + ')';
            if (coordStr.indexOf(rotateCenterCoords.trim()) !== -1 || formattedRotateCenter.indexOf(coords) !== -1) {
              rotationCenter = label;
            }
          });

          if (!rotationCenter) rotationCenter = formattedRotateCenter;
        }

        var lineStyle = convertLineStyle(options);

        var finalXRadius = xRadiusStr;
        var finalYRadius = yRadiusStr;

        if (shouldRound && xRadiusStr && yRadiusStr) {
          var xRadiusNum = parseFloat(xRadiusStr);
          var yRadiusNum = parseFloat(yRadiusStr);
          var xUnit = xRadiusStr.replace(/[0-9\.\-\s]/g, '');
          var yUnit = yRadiusStr.replace(/[0-9\.\-\s]/g, '');
          finalXRadius = roundToThreeDecimals(xRadiusNum) + xUnit;
          finalYRadius = roundToThreeDecimals(yRadiusNum) + yUnit;
        }

        var ellipseObj = {
          center: centerLabel ? '(' + centerLabel + ')' : formattedCenter,
          xRadius: finalXRadius,
          yRadius: finalYRadius,
          lineStyle: lineStyle,
          originalCenter: centerCoords,
          originalRadii: radii,
          hasRotation: !!rotateMatch
        };

        if (rotateMatch) {
          ellipseObj.rotationAngle = rotationAngle;
          ellipseObj.rotationCenter = rotationCenter ? '(' + rotationCenter + ')' : formattedCenter;
        }

        ellipses.push(ellipseObj);
      });

      // 角度标记
      var angleRegex = /\\draw\s*\[shift=\{\(([^,]+),([^)]+)\)\}[^\]]*\]\s*\(0,0\)\s*--\s*\(([^:]+):([^)]+)\)\s*arc\s*\(([^:]+):([^)]+):([^)]+)\)\s*--\s*cycle;/g;
      var angleMatches = [];
      var agm;
      while ((agm = angleRegex.exec(code)) !== null) { angleMatches.push(agm); }
      var angles = [];

      angleMatches.forEach(function (match) {
        var centerX = match[1].trim();
        var centerY = match[2].trim();
        var startAngle = match[3].trim();
        var radius = match[4].trim();
        var arcStartAngle = match[5].trim(); // not used directly
        var endAngle = match[6].trim();
        var radius2 = match[7].trim(); // not used directly
        var centerCoords = '(' + centerX + ',' + centerY + ')';
        var formattedCenter = formatCoordinate(centerCoords, shouldRound);

        var centerLabel = null;
        pointMap.forEach(function (coords, label) {
          var coordStr = coords.indexOf('(') !== -1 ? coords : '(' + coords + ')';
          if (coordStr.indexOf(centerX + ',' + centerY) !== -1 || formattedCenter.indexOf(coords) !== -1) {
            centerLabel = label;
          }
        });

        var finalStartAngle = startAngle;
        var finalEndAngle = endAngle;
        var finalRadius = radius;

        if (shouldRound) {
          finalStartAngle = roundToThreeDecimals(parseFloat(startAngle));
          finalEndAngle = roundToThreeDecimals(parseFloat(endAngle));
          finalRadius = roundToThreeDecimals(parseFloat(radius));
        }

        angles.push({
          center: centerLabel ? '(' + centerLabel + ')' : formattedCenter,
          startAngle: finalStartAngle,
          endAngle: finalEndAngle,
          radius: finalRadius,
          originalCenter: centerCoords
        });
      });

      // === 构建输出 ===
      var result = '\\begin{tikzpicture}[scale=1]\n';

      if (pointMap.size > 0) {
        result += '  % 坐标点定义\n';
        pointMap.forEach(function (coords, label) {
          result += '  \\coordinate (' + label + ') at ' + (coords.indexOf('(') !== -1 ? coords : '(' + coords + ')') + ';\n';
        });
        result += '\n';
      }

      if (functionPlotsResult.hasFunctions) {
        result += '  % 函数图像\n';
        result += functionPlotsResult.scopeCode + '\n';
      }

      // 贝塞尔曲线
      if (parametricPlotResult.hasParametricPlots) {
        result += '  % 贝塞尔曲线\n';
        parametricPlotResult.plots.forEach(function (plot) {
          var lineStyleStr = plot.lineStyle ? '[' + plot.lineStyle + ', smooth, samples=100, domain=0:1, variable=\\t]' : '[smooth, samples=100, domain=0:1, variable=\\t]';
          result += '  \\draw' + lineStyleStr + ' plot\n';
          result += '    ({' + plot.xExpression + '},\n';
          result += '     {' + plot.yExpression + '});\n\n';
        });
      }

      if (lineMatches.length > 0 || circles.length > 0 || arcs.length > 0 || ellipses.length > 0 || angles.length > 0 || angleLabels.length > 0 || sectors.length > 0) {
        result += '  % 几何元素\n';

        // 角度标记（背景层）
        if (angles.length > 0) {
          result += '  % 角度\n';
          angles.forEach(function (angle) {
            result += '  \\fill [shift=' + angle.center + ', gray!30] (0,0) -- (' + angle.startAngle + ':' + angle.radius + ') arc (' + angle.startAngle + ':' + angle.endAngle + ':' + angle.radius + ') -- cycle;\n';
          });
          if (lineMatches.length > 0 || circles.length > 0 || arcs.length > 0 || ellipses.length > 0) {
            result += '\n';
          }
        }

        // 扇形
        if (sectors.length > 0) {
          result += '  % 扇形绘制\n';
          sectors.forEach(function (sector) {
            var style = sector.lineStyle ? '[' + sector.lineStyle + ']' : '';
            result += '  \\draw' + style + ' [shift={(' + sector.shiftX + ',' + sector.shiftY + ')}] (0,0) -- plot[domain=' + sector.startAngle + ':' + sector.endAngle + ']({1*' + sector.radius + '*cos(\\x r)+0*' + sector.radius + '*sin(\\x r)},{0*' + sector.radius + '*cos(\\x r)+1*' + sector.radius + '*sin(\\x r)}) -- cycle;\n';
          });
          if (lineMatches.length > 0) result += '\n';
        }

        // 圆
        if (circles.length > 0) {
          circles.forEach(function (circle) {
            if (circle.lineStyle) {
              result += '  \\draw[' + circle.lineStyle + '] ' + circle.center + ' circle (' + circle.radius + ');\n';
            } else {
              result += '  \\draw ' + circle.center + ' circle (' + circle.radius + ');\n';
            }
          });
          if (lineMatches.length > 0 || arcs.length > 0) result += '\n';
        }

        // 椭圆
        if (ellipses.length > 0) {
          result += '  % 椭圆\n';
          ellipses.forEach(function (ellipse) {
            var drawOptions = [];
            if (ellipse.lineStyle) drawOptions.push(ellipse.lineStyle);
            if (ellipse.hasRotation) {
              drawOptions.push('rotate around={' + ellipse.rotationAngle + ':' + ellipse.rotationCenter + '}');
            }
            if (drawOptions.length > 0) {
              result += '  \\draw[' + drawOptions.join(', ') + '] ' + ellipse.center + ' ellipse (' + ellipse.xRadius + ' and ' + ellipse.yRadius + ');\n';
            } else {
              result += '  \\draw ' + ellipse.center + ' ellipse (' + ellipse.xRadius + ' and ' + ellipse.yRadius + ');\n';
            }
          });
          if (lineMatches.length > 0 || arcs.length > 0) result += '\n';
        }

        // 圆弧
        if (arcs.length > 0) {
          result += '  % 圆弧绘制\n';
          arcs.forEach(function (arc) {
            if (arc.style.trim()) {
              result += '  \\draw' + arc.style + ' plot[domain=' + arc.startAngle + ':' + arc.endAngle + ']({1*' + arc.radius + '*cos(\\x r)+0*' + arc.radius + '*sin(\\x r)},{0*' + arc.radius + '*cos(\\x r)+1*' + arc.radius + '*sin(\\x r)});\n';
            } else {
              result += '  \\draw plot[domain=' + arc.startAngle + ':' + arc.endAngle + ']({1*' + arc.radius + '*cos(\\x r)+0*' + arc.radius + '*sin(\\x r)},{0*' + arc.radius + '*cos(\\x r)+1*' + arc.radius + '*sin(\\x r)});\n';
            }
          });
          if (lineMatches.length > 0) result += '\n';
        }

        // 线段
        var processedLines = new Set();

        var parseCoords = function (str) {
          var m = str.match(/\(([^,]+),([^)]+)\)/);
          if (!m) return null;
          return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
        };

        lineMatches.forEach(function (match) {
          var style = match[1] || '';
          var coord1 = match[2];
          var coord2 = match[3];

          var convertedStyle = convertLineStyle(style);

          var label1 = null;
          var label2 = null;

          var targetCoord1 = formatCoordinate('(' + coord1 + ')', shouldRound);
          var targetCoord2 = formatCoordinate('(' + coord2 + ')', shouldRound);

          var t1 = parseCoords(targetCoord1);
          var t2 = parseCoords(targetCoord2);

          pointMap.forEach(function (coords, label) {
            var pointCoordStr = coords.indexOf('(') !== -1 ? coords : '(' + coords + ')';
            var p = parseCoords(pointCoordStr);

            if (p && t1 && Math.abs(p.x - t1.x) < 0.001 && Math.abs(p.y - t1.y) < 0.001) {
              label1 = label;
            }
            if (p && t2 && Math.abs(p.x - t2.x) < 0.001 && Math.abs(p.y - t2.y) < 0.001) {
              label2 = label;
            }
          });

          if (label1 && label2) {
            var lineKey = label1 + '-' + label2;
            var reverseKey = label2 + '-' + label1;

            if (!processedLines.has(lineKey) && !processedLines.has(reverseKey)) {
              if (convertedStyle) {
                result += '  \\draw[' + convertedStyle + '] (' + label1 + ') -- (' + label2 + ');\n';
              } else {
                result += '  \\draw (' + label1 + ') -- (' + label2 + ');\n';
              }
              processedLines.add(lineKey);
            }
          } else {
            var formattedCoord1 = formatCoordinate('(' + coord1 + ')', shouldRound);
            var formattedCoord2 = formatCoordinate('(' + coord2 + ')', shouldRound);
            if (convertedStyle) {
              result += '  \\draw[' + convertedStyle + '] ' + formattedCoord1 + ' -- ' + formattedCoord2 + ';\n';
            } else {
              result += '  \\draw ' + formattedCoord1 + ' -- ' + formattedCoord2 + ';\n';
            }
          }
        });
      }

      // 点标记
      if (includePoints && pointMap.size > 0) {
        result += '\n  % 点标记\n';
        pointMap.forEach(function (coords, label) {
          result += '  \\draw[fill=black] (' + label + ') circle (1pt);\n';
        });
      }

      // 点标签
      if (includeLabels && pointMap.size > 0) {
        result += '\n  % 点标签\n';

        var allPointsData = [];
        pointMap.forEach(function (coords, label) {
          var m = coords.match(/\(?([^,]+),([^)]+)\)?/);
          if (m) {
            var x = parseFloat(m[1]);
            var y = parseFloat(m[2]);
            allPointsData.push({ label: label, x: x, y: y });
          }
        });

        allPointsData.forEach(function (point) {
          var position = getSmartLabelPosition(point.x, point.y, allPointsData);
          result += '  \\node [' + position + '] at (' + point.label + ') {$' + point.label + '$};\n';
        });
      }

      // 角度标签
      if (angleLabels.length > 0) {
        result += '\n  % 角度标签\n';
        angleLabels.forEach(function (label) {
          result += '  \\draw ' + label.coords + ' node {$' + label.content + '^{\\circ}$};\n';
        });
      }

      // 文本标签
      if (textLabels.length > 0) {
        result += '\n  % 文本标签\n';
        textLabels.forEach(function (label) {
          result += '  \\draw ' + label.coords + ' node[' + label.options + '] {' + label.content + '};\n';
        });
      }

      result += '\\end{tikzpicture}';

      return result;

    } catch (error) {
      console.error('清理出错:', error);
      throw error;
    }
  }

  // 挂载到全局
  window.filterTikzCode = cleanTikZCode;
})();
