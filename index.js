Promise.all([
	fetch('output.json').then(r => r.json()),
	fetch('https://script.google.com/macros/s/AKfycbxDTpFRcGUKWb10_dRcnIe99hmOw8DI3s7RsqfwEOLBx0wGnIZaI0P62B6WC6slLGeo-w/exec')
		.then(res => res.json())
])
.then(([coordsData, data]) => {
	const polygons = [];
	const bounds = [];

	data.Участки.forEach(plot => {
		const id = plot["№ участка"];
		const status = plot["Занятость участка"];
		const area = plot["Площадь участка"];
		const points = coordsData[id];

		if (!points) return; // если нет координат — скипаем

		const gpsPoints = points.map(([x, y]) => pxToGPS(x, y));

		let color;
		switch (status) {
			case "Продан": color = 'rgba(255, 0, 0, 0.6)'; break;
			case "Свободен": color = 'rgba(0, 255, 0, 0.6)'; break;
			case "Скоро в продаже": color = 'rgba(169, 169, 169, 0.6)'; break;
			case "Забронирован": color = 'rgba(255, 255, 0, 0.6)'; break;
			default: color = 'rgba(0, 0, 255, 0.6)';
		}

		const polygon = new ymaps.Polygon(
			[gpsPoints],
			{},
			{
				fillColor: color,
				strokeColor: color,
				strokeWidth: 2,
				cursor: 'pointer'
			}
		);

		bounds.push(...gpsPoints);

		polygon.events
			.add('mouseenter', () => polygon.options.set('fillColor', color.replace('0.6', '0.8')))
			.add('mouseleave', () => polygon.options.set('fillColor', color));

		polygon.events.add('click', () => {
			openModal({
				id,
				area,
				status,
				points: gpsPoints
			});
		});

		map.geoObjects.add(polygon);
	});

	if (bounds.length) {
		map.setBounds(ymaps.util.bounds.fromPoints(bounds), { checkZoomRange: true });
	}
});
