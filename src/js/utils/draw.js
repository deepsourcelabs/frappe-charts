import { getBarHeightAndYAttr, truncateString, shortenLargeNumber, getSplineCurvePointsStr } from './draw-utils';
import { getStringWidth, isValidNumber, round } from './helpers';
import { DOT_OVERLAY_SIZE_INCR } from './constants';

export const AXIS_TICK_LENGTH = 6;
const LABEL_MARGIN = 4;
const LABEL_MAX_CHARS = 18;
export const FONT_SIZE = 10;
const BASE_LINE_COLOR = '#E2E6E9';

function $(expr, con) {
	return typeof expr === "string" ? (con || document).querySelector(expr) : expr || null;
}

export function createSVG(tag, o) {
	var element = document.createElementNS("http://www.w3.org/2000/svg", tag);

	for (var i in o) {
		var val = o[i];

		if (i === "inside") {
			$(val).appendChild(element);
		}
		else if (i === "around") {
			var ref = $(val);
			ref.parentNode.insertBefore(element, ref);
			element.appendChild(ref);

		} else if (i === "styles") {
			if (typeof val === "object") {
				Object.keys(val).map(prop => {
					element.style[prop] = val[prop];
				});
			}
		} else {
			if (i === "className") { i = "class"; }
			if (i === "innerHTML") {
				element['textContent'] = val;
			} else {
				element.setAttribute(i, val);
			}
		}
	}

	return element;
}

function renderVerticalGradient(svgDefElem, gradientId) {
	return createSVG('linearGradient', {
		inside: svgDefElem,
		id: gradientId,
		x1: 0,
		x2: 0,
		y1: 0,
		y2: 1
	});
}

function setGradientStop(gradElem, offset, color, opacity) {
	return createSVG('stop', {
		'inside': gradElem,
		'style': `stop-color: ${color}`,
		'offset': offset,
		'stop-opacity': opacity
	});
}

export function makeSVGContainer(parent, className, width, height) {
	return createSVG('svg', {
		className: className,
		inside: parent,
		width: width,
		height: height
	});
}

export function makeSVGDefs(svgContainer) {
	return createSVG('defs', {
		inside: svgContainer,
	});
}

export function makeSVGGroup(className, transform = '', parent = undefined) {
	let args = {
		className: className,
		transform: transform
	};
	if (parent) args.inside = parent;
	return createSVG('g', args);
}

export function wrapInSVGGroup(elements, className = '') {
	let g = createSVG('g', {
		className: className
	});
	elements.forEach(e => g.appendChild(e));
	return g;
}

export function makePath(pathStr, className = '', stroke = 'none', fill = 'none', strokeWidth = 2) {
	return createSVG('path', {
		className: className,
		d: pathStr,
		styles: {
			stroke: stroke,
			fill: fill,
			'stroke-width': strokeWidth
		}
	});
}

export function makeArcPathStr(startPosition, endPosition, center, radius, clockWise = 1, largeArc = 0) {
	let [arcStartX, arcStartY] = [center.x + startPosition.x, center.y + startPosition.y];
	let [arcEndX, arcEndY] = [center.x + endPosition.x, center.y + endPosition.y];
	return `M${center.x} ${center.y}
		L${arcStartX} ${arcStartY}
		A ${radius} ${radius} 0 ${largeArc} ${clockWise ? 1 : 0}
		${arcEndX} ${arcEndY} z`;
}

export function makeCircleStr(startPosition, endPosition, center, radius, clockWise = 1, largeArc = 0) {
	let [arcStartX, arcStartY] = [center.x + startPosition.x, center.y + startPosition.y];
	let [arcEndX, midArc, arcEndY] = [center.x + endPosition.x, center.y * 2, center.y + endPosition.y];
	return `M${center.x} ${center.y}
		L${arcStartX} ${arcStartY}
		A ${radius} ${radius} 0 ${largeArc} ${clockWise ? 1 : 0}
		${arcEndX} ${midArc} z
		L${arcStartX} ${midArc}
		A ${radius} ${radius} 0 ${largeArc} ${clockWise ? 1 : 0}
		${arcEndX} ${arcEndY} z`;
}

export function makeArcStrokePathStr(startPosition, endPosition, center, radius, clockWise = 1, largeArc = 0) {
	let [arcStartX, arcStartY] = [center.x + startPosition.x, center.y + startPosition.y];
	let [arcEndX, arcEndY] = [center.x + endPosition.x, center.y + endPosition.y];

	return `M${arcStartX} ${arcStartY}
		A ${radius} ${radius} 0 ${largeArc} ${clockWise ? 1 : 0}
		${arcEndX} ${arcEndY}`;
}

export function makeStrokeCircleStr(startPosition, endPosition, center, radius, clockWise = 1, largeArc = 0) {
	let [arcStartX, arcStartY] = [center.x + startPosition.x, center.y + startPosition.y];
	let [arcEndX, midArc, arcEndY] = [center.x + endPosition.x, radius * 2 + arcStartY, center.y + startPosition.y];

	return `M${arcStartX} ${arcStartY}
		A ${radius} ${radius} 0 ${largeArc} ${clockWise ? 1 : 0}
		${arcEndX} ${midArc}
		M${arcStartX} ${midArc}
		A ${radius} ${radius} 0 ${largeArc} ${clockWise ? 1 : 0}
		${arcEndX} ${arcEndY}`;
}

export function makeGradient(svgDefElem, color, lighter = false) {
	let gradientId = 'path-fill-gradient' + '-' + color + '-' + (lighter ? 'lighter' : 'default');
	let gradientDef = renderVerticalGradient(svgDefElem, gradientId);
	let opacities = [1, 0.6, 0.2];
	if (lighter) {
		opacities = [0.15, 0.05, 0];
	}

	setGradientStop(gradientDef, "0%", color, opacities[0]);
	setGradientStop(gradientDef, "50%", color, opacities[1]);
	setGradientStop(gradientDef, "100%", color, opacities[2]);

	return gradientId;
}

export function rightRoundedBar(x, width, height) {
	// https://medium.com/@dennismphil/one-side-rounded-rectangle-using-svg-fb31cf318d90
	let radius = height / 2;
	let xOffset = width - radius;

	return `M${x},0 h${xOffset} q${radius},0 ${radius},${radius} q0,${radius} -${radius},${radius} h-${xOffset} v${height}z`;
}

export function leftRoundedBar(x, width, height) {
	let radius = height / 2;
	let xOffset = width - radius;

	return `M${x + radius},0 h${xOffset} v${height} h-${xOffset} q-${radius}, 0 -${radius},-${radius} q0,-${radius} ${radius},-${radius}z`;
}

export function percentageBar(x, y, width, height, isFirst, isLast, fill = 'none') {
	if (isLast) {
		let pathStr = rightRoundedBar(x, width, height);
		return makePath(pathStr, 'percentage-bar', null, fill);
	}

	if (isFirst) {
		let pathStr = leftRoundedBar(x, width, height);
		return makePath(pathStr, 'percentage-bar', null, fill);
	}

	let args = {
		className: 'percentage-bar',
		x: x,
		y: y,
		width: width,
		height: height,
		fill: fill
	};

	return createSVG("rect", args);
}

export function heatSquare(className, x, y, size, radius, fill = 'none', data = {}) {
	let args = {
		className: className,
		x: x,
		y: y,
		width: size,
		height: size,
		rx: radius,
		fill: fill
	};

	Object.keys(data).map(key => {
		args[key] = data[key];
	});

	return createSVG("rect", args);
}

export function legendDot(x, y, size, radius, fill = 'none', label, value, font_size = null, truncate = false) {
	label = truncate ? truncateString(label, LABEL_MAX_CHARS) : label;
	if (!font_size) font_size = FONT_SIZE;

	let args = {
		className: 'legend-dot',
		x: 0,
		y: 4 - size,
		height: size,
		width: size,
		rx: radius,
		fill: fill
	};

	let textLabel = createSVG('text', {
		className: 'legend-dataset-label',
		x: size,
		y: 0,
		dx: (font_size) + 'px',
		dy: (font_size / 3) + 'px',
		'font-size': (font_size * 1.6) + 'px',
		'text-anchor': 'start',
		innerHTML: label
	});

	let textValue = null;
	if (value) {
		textValue = createSVG('text', {
			className: 'legend-dataset-value',
			x: size,
			y: FONT_SIZE + 10,
			dx: (FONT_SIZE) + 'px',
			dy: (FONT_SIZE / 3) + 'px',
			'font-size': (FONT_SIZE * 1.2) + 'px',
			'text-anchor': 'start',
			innerHTML: value
		});
	}

	let group = createSVG('g', {
		transform: `translate(${x}, ${y})`
	});
	group.appendChild(createSVG("rect", args));
	group.appendChild(textLabel);

	if (value && textValue) {
		group.appendChild(textValue);
	}

	return group;
}

export function makeText(className, x, y, content, options = {}) {
	let fontSize = options.fontSize || FONT_SIZE;
	let dy = options.dy !== undefined ? options.dy : (fontSize / 2);
	let fill = options.fill || "var(--charts-label-color)";
	let textAnchor = options.textAnchor || 'start';
	return createSVG('text', {
		className: className,
		x: x,
		y: y,
		dy: dy + 'px',
		'font-size': fontSize + 'px',
		fill: fill,
		'text-anchor': textAnchor,
		innerHTML: content
	});
}

function makeVertLine(x, label, y1, y2, options = {}) {
	let l = createSVG('line', {
		className: 'line-vertical ' + options.className,
		x1: 0,
		x2: 0,
		y1: y1,
		y2: y2,
		styles: {
			stroke: options.stroke
		}
	});

	let text = createSVG('text', {
		x: 0,
		y: y1 > y2 ? y1 + LABEL_MARGIN : y1 - LABEL_MARGIN - FONT_SIZE,
		dy: FONT_SIZE + 'px',
		'font-size': FONT_SIZE + 'px',
		'text-anchor': 'middle',
		innerHTML: label + ""
	});

	let line = createSVG('g', {
		transform: `translate(${x}, 0)`
	});

	line.appendChild(l);
	line.appendChild(text);

	return line;
}

function makeHoriLine(y, label, x1, x2, options = {}) {
	if (!options.lineType) options.lineType = '';
	if (options.shortenNumbers) {
		if (options.numberFormatter) {
			label = options.numberFormatter(label);
		} else {
			label = shortenLargeNumber(label);
		}
	}

	let className = 'line-horizontal ' + options.className +
		(options.lineType === "dashed" ? "dashed" : "");

	let l = createSVG('line', {
		className: className,
		x1: x1,
		x2: x2,
		y1: 0,
		y2: 0,
		styles: {
			stroke: options.stroke
		}
	});

	let text = createSVG('text', {
		x: x1 < x2 ? x1 - LABEL_MARGIN : x1 + LABEL_MARGIN,
		y: 0,
		dy: (FONT_SIZE / 2 - 2) + 'px',
		'font-size': FONT_SIZE + 'px',
		'text-anchor': x1 < x2 ? 'end' : 'start',
		innerHTML: label + ""
	});

	let line = createSVG('g', {
		transform: `translate(0, ${y})`,
		'stroke-opacity': 1
	});

	if (text === 0 || text === '0') {
		line.style.stroke = "rgba(27, 31, 35, 0.6)";
	}

	line.appendChild(l);
	line.appendChild(text);

	return line;
}

export function yLine(y, label, width, options = {}) {
	if (!isValidNumber(y)) y = 0;

	if (!options.pos) options.pos = 'left';
	if (!options.offset) options.offset = 0;
	if (!options.mode) options.mode = 'span';
	if (!options.stroke) options.stroke = BASE_LINE_COLOR;
	if (!options.className) options.className = '';

	let x1 = -1 * AXIS_TICK_LENGTH;
	let x2 = options.mode === 'span' ? width + AXIS_TICK_LENGTH : 0;

	if (options.mode === 'tick' && options.pos === 'right') {
		x1 = width + AXIS_TICK_LENGTH;
		x2 = width;
	}

	// let offset = options.pos === 'left' ? -1 * options.offset : options.offset;

	x1 += options.offset;
	x2 += options.offset;

	if (typeof label === "number") label = round(label);

	return makeHoriLine(y, label, x1, x2, {
		className: options.className,
		lineType: options.lineType,
		shortenNumbers: options.shortenNumbers,
		numberFormatter: options.numberFormatter,
	});
}

export function xLine(x, label, height, options = {}) {
	if (!isValidNumber(x)) x = 0;

	if (!options.pos) options.pos = 'bottom';
	if (!options.offset) options.offset = 0;
	if (!options.mode) options.mode = 'span';
	if (!options.className) options.className = '';

	// Draw X axis line in span/tick mode with optional label
	//                        	y2(span)
	// 						|
	// 						|
	//				x line	|
	//						|
	// 					   	|
	// ---------------------+-- y2(tick)
	//						|
	//							y1

	let y1 = height + AXIS_TICK_LENGTH;
	let y2 = options.mode === 'span' ? -1 * AXIS_TICK_LENGTH : height;

	if (options.mode === 'tick' && options.pos === 'top') {
		// top axis ticks
		y1 = -1 * AXIS_TICK_LENGTH;
		y2 = 0;
	}

	return makeVertLine(x, label, y1, y2, {
		className: options.className,
		lineType: options.lineType
	});
}

export function yMarker(y, label, width, options = {}) {
	if (!isValidNumber(y)) y = 0;

	if (!options.labelPos) options.labelPos = 'right';
	if (!options.lineType) options.lineType = 'dashed';
	let x = options.labelPos === 'left' ? LABEL_MARGIN
		: width - getStringWidth(label, 5) - LABEL_MARGIN;

	let labelSvg = createSVG('text', {
		className: 'chart-label',
		x: x,
		y: 0,
		dy: (FONT_SIZE / -2) + 'px',
		'font-size': FONT_SIZE + 'px',
		'text-anchor': 'start',
		innerHTML: label + ""
	});

	let line = makeHoriLine(y, '', 0, width, {
		stroke: options.stroke || BASE_LINE_COLOR,
		className: options.className || '',
		lineType: options.lineType
	});

	line.appendChild(labelSvg);

	return line;
}

export function yRegion(y1, y2, width, label, options = {}) {
	// return a group
	let height = y1 - y2;

	let rect = createSVG('rect', {
		className: `bar mini`, // remove class
		styles: {
			fill: options.fill || `rgba(228, 234, 239, 0.49)`,
			stroke: options.stroke || BASE_LINE_COLOR,
			'stroke-dasharray': `${width}, ${height}`
		},
		// 'data-point-index': index,
		x: 0,
		y: 0,
		width: width,
		height: height
	});

	if (!options.labelPos) options.labelPos = 'right';
	let x = options.labelPos === 'left' ? LABEL_MARGIN
		: width - getStringWidth(label + "", 4.5) - LABEL_MARGIN;

	let labelSvg = createSVG('text', {
		className: 'chart-label',
		x: x,
		y: 0,
		dy: (FONT_SIZE / -2) + 'px',
		'font-size': FONT_SIZE + 'px',
		'text-anchor': 'start',
		innerHTML: label + ""
	});

	let region = createSVG('g', {
		transform: `translate(0, ${y2})`
	});

	region.appendChild(rect);
	region.appendChild(labelSvg);

	return region;
}

export function datasetBar(x, yTop, width, color, label = '', index = 0, offset = 0, meta = {}) {
	let [height, y] = getBarHeightAndYAttr(yTop, meta.zeroLine);
	y -= offset;

	if (height === 0) {
		height = meta.minHeight;
		y -= meta.minHeight;
	}

	// Preprocess numbers to avoid svg building errors
	if (!isValidNumber(x)) x = 0;
	if (!isValidNumber(y)) y = 0;
	if (!isValidNumber(height, true)) height = 0;
	if (!isValidNumber(width, true)) width = 0;

	// x y h w

	// M{x},{y+r}
	// q0,-{r} {r},-{r}
	// q{r},0 {r},{r}
	// v{h-r}
	// h-{w}z

	// let radius = width/2;
	// let pathStr = `M${x},${y+radius} q0,-${radius} ${radius},-${radius} q${radius},0 ${radius},${radius} v${height-radius} h-${width}z`

	// let rect = createSVG('path', {
	// 	className: 'bar mini',
	// 	d: pathStr,
	// 	styles: { fill: color },
	// 	x: x,
	// 	y: y,
	// 	'data-point-index': index,
	// });

	let rect = createSVG('rect', {
		className: `bar mini`,
		style: `fill: ${color}`,
		'data-point-index': index,
		x: x,
		y: y,
		width: width,
		height: height
	});

	label += "";

	if (!label && !label.length) {
		return rect;
	} else {
		rect.setAttribute('y', 0);
		rect.setAttribute('x', 0);
		let text = createSVG('text', {
			className: 'data-point-value',
			x: width / 2,
			y: 0,
			dy: (FONT_SIZE / 2 * -1) + 'px',
			'font-size': FONT_SIZE + 'px',
			'text-anchor': 'middle',
			innerHTML: label
		});

		let group = createSVG('g', {
			'data-point-index': index,
			transform: `translate(${x}, ${y})`
		});
		group.appendChild(rect);
		group.appendChild(text);

		return group;
	}
}

export function datasetDot(x, y, radius, color, label = '', index = 0, hideDotBorder = false) {
	let dot = createSVG('circle', {
		style: `fill: ${color}; ${hideDotBorder ? `stroke: ${color}`: ''}`,
		'data-point-index': index,
		cx: x,
		cy: y,
		r: radius
	});

	label += "";

	if (!label && !label.length) {
		return dot;
	} else {
		dot.setAttribute('cy', 0);
		dot.setAttribute('cx', 0);

		let text = createSVG('text', {
			className: 'data-point-value',
			x: 0,
			y: 0,
			dy: (FONT_SIZE / 2 * -1 - radius) + 'px',
			'font-size': FONT_SIZE + 'px',
			'text-anchor': 'middle',
			innerHTML: label
		});

		let group = createSVG('g', {
			'data-point-index': index,
			transform: `translate(${x}, ${y})`
		});
		group.appendChild(dot);
		group.appendChild(text);

		return group;
	}
}

export function getPaths(xList, yList, color, options = {}, meta = {}) {
	let pointsList = yList.map((y, i) => (xList[i] + ',' + y));
	let pointsStr = pointsList.join("L");

	// Spline
	if (options.spline)
		pointsStr = getSplineCurvePointsStr(xList, yList);

	let path = makePath("M" + pointsStr, 'line-graph-path', color);

	// HeatLine
	if (options.heatline) {
		let gradient_id = makeGradient(meta.svgDefs, color);
		path.style.stroke = `url(#${gradient_id})`;
	}

	let paths = {
		path: path
	};

	// Region
	if (options.regionFill) {
		let gradient_id_region = makeGradient(meta.svgDefs, color, true);

		let pathStr = "M" + `${xList[0]},${meta.zeroLine}L` + pointsStr + `L${xList.slice(-1)[0]},${meta.zeroLine}`;
		paths.region = makePath(pathStr, `region-fill`, 'none', `url(#${gradient_id_region})`);
	}

	return paths;
}

export let makeOverlay = {
	'bar': (unit) => {
		let transformValue;
		if (unit.nodeName !== 'rect') {
			transformValue = unit.getAttribute('transform');
			unit = unit.childNodes[0];
		}
		let overlay = unit.cloneNode();
		overlay.style.fill = '#000000';
		overlay.style.opacity = '0.4';

		if (transformValue) {
			overlay.setAttribute('transform', transformValue);
		}
		return overlay;
	},

	'dot': (unit) => {
		let transformValue;
		if (unit.nodeName !== 'circle') {
			transformValue = unit.getAttribute('transform');
			unit = unit.childNodes[0];
		}
		let overlay = unit.cloneNode();
		let radius = unit.getAttribute('r');
		let fill = unit.getAttribute('fill');
		overlay.setAttribute('r', parseInt(radius) + DOT_OVERLAY_SIZE_INCR);
		overlay.setAttribute('fill', fill);
		overlay.style.opacity = '0.6';

		if (transformValue) {
			overlay.setAttribute('transform', transformValue);
		}
		return overlay;
	},

	'heat_square': (unit) => {
		let transformValue;
		if (unit.nodeName !== 'circle') {
			transformValue = unit.getAttribute('transform');
			unit = unit.childNodes[0];
		}
		let overlay = unit.cloneNode();
		let radius = unit.getAttribute('r');
		let fill = unit.getAttribute('fill');
		overlay.setAttribute('r', parseInt(radius) + DOT_OVERLAY_SIZE_INCR);
		overlay.setAttribute('fill', fill);
		overlay.style.opacity = '0.6';

		if (transformValue) {
			overlay.setAttribute('transform', transformValue);
		}
		return overlay;
	}
};

export let updateOverlay = {
	'bar': (unit, overlay) => {
		let transformValue;
		if (unit.nodeName !== 'rect') {
			transformValue = unit.getAttribute('transform');
			unit = unit.childNodes[0];
		}
		let attributes = ['x', 'y', 'width', 'height'];
		Object.values(unit.attributes)
			.filter(attr => attributes.includes(attr.name) && attr.specified)
			.map(attr => {
				overlay.setAttribute(attr.name, attr.nodeValue);
			});

		if (transformValue) {
			overlay.setAttribute('transform', transformValue);
		}
	},

	'dot': (unit, overlay) => {
		let transformValue;
		if (unit.nodeName !== 'circle') {
			transformValue = unit.getAttribute('transform');
			unit = unit.childNodes[0];
		}
		let attributes = ['cx', 'cy'];
		Object.values(unit.attributes)
			.filter(attr => attributes.includes(attr.name) && attr.specified)
			.map(attr => {
				overlay.setAttribute(attr.name, attr.nodeValue);
			});

		if (transformValue) {
			overlay.setAttribute('transform', transformValue);
		}
	},

	'heat_square': (unit, overlay) => {
		let transformValue;
		if (unit.nodeName !== 'circle') {
			transformValue = unit.getAttribute('transform');
			unit = unit.childNodes[0];
		}
		let attributes = ['cx', 'cy'];
		Object.values(unit.attributes)
			.filter(attr => attributes.includes(attr.name) && attr.specified)
			.map(attr => {
				overlay.setAttribute(attr.name, attr.nodeValue);
			});

		if (transformValue) {
			overlay.setAttribute('transform', transformValue);
		}
	},
};
