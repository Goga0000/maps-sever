const fs = require('fs');
const { parse } = require('svgson');
const parsePath = require('svg-path-parser');

// Функция вычисления площади многоугольника (по формуле Гаусса)
function polygonArea(points) {
	let area = 0;
	const n = points.length;
	for (let i = 0; i < n; i++) {
		const [x1, y1] = points[i];
		const [x2, y2] = points[(i + 1) % n];
		area += (x1 * y2 - x2 * y1);
	}
	return Math.abs(area / 2);
}

// Конвертация SVG path в массив абсолютных точек
function extractPointsFromPath(d) {
	const commands = parsePath(d);
	let points = [];
	let current = [0, 0];
	let start = null;

	for (const cmd of commands) {
		switch (cmd.code) {
			case 'M':
				current = [cmd.x, cmd.y];
				start = current;
				points.push(current);
				break;
			case 'm':
				current = [current[0] + cmd.x, current[1] + cmd.y];
				start = current;
				points.push(current);
				break;
			case 'L':
				current = [cmd.x, cmd.y];
				points.push(current);
				break;
			case 'l':
				current = [current[0] + cmd.x, current[1] + cmd.y];
				points.push(current);
				break;
			case 'H':
				current = [cmd.x, current[1]];
				points.push(current);
				break;
			case 'h':
				current = [current[0] + cmd.x, current[1]];
				points.push(current);
				break;
			case 'V':
				current = [current[0], cmd.y];
				points.push(current);
				break;
			case 'v':
				current = [current[0], current[1] + cmd.y];
				points.push(current);
				break;
			case 'Z':
			case 'z':
				if (start) {
					points.push(start);
				}
				break;
			// Кривые игнорируем (можно добавить интерполяцию позже)
		}
	}

	return points;
}

// Основная обработка SVG-файла
async function processSVG(filepath) {
	const svgContent = fs.readFileSync(filepath, 'utf-8');
	const parsed = await parse(svgContent);

	const polygons = [];

	function traverse(node) {
		if (node.name === 'path' && node.attributes?.id && node.attributes?.d) {
			const id = node.attributes.id;
			const d = node.attributes.d;
			const points = extractPointsFromPath(d);

			if (points.length >= 3) {
				const area = polygonArea(points);
				polygons.push({ id, points, area });
			}
		}

		if (node.children) {
			node.children.forEach(traverse);
		}
	}

	traverse(parsed);

	fs.writeFileSync('output.json', JSON.stringify(polygons, null, 2), 'utf-8');
	console.log(`✅ Разобрано и сохранено ${polygons.length} полигонов в output.json`);
}

// Укажи путь к SVG-файлу
processSVG('./maps.svg');
