		const mapCenter = [57.315011, 65.348673];
		const svgWidth = 3220;
		const svgHeight = 1817.5;

		const gpsCorners = {
			topLeft: { lat: 57.317898, lon: 65.342467 },
			topRight: { lat: 57.317625, lon: 65.355748 },
			bottomLeft: { lat: 57.312472, lon: 65.338479 },
			bottomRight: { lat: 57.312434, lon: 65.355387 }
		};

		function pxToGPS(x, y) {
			const nx = x / svgWidth;
			const ny = 1 - (y / svgHeight); // y идёт сверху вниз — нужно инвертировать

			// Линейная интерполяция по широте
			const latTop = gpsCorners.topLeft.lat + (gpsCorners.topRight.lat - gpsCorners.topLeft.lat) * nx;
			const latBottom = gpsCorners.bottomLeft.lat + (gpsCorners.bottomRight.lat - gpsCorners.bottomLeft.lat) * nx;
			const lat = latBottom + (latTop - latBottom) * ny;

			// Линейная интерполяция по долготе
			const lonLeft = gpsCorners.topLeft.lon + (gpsCorners.bottomLeft.lon - gpsCorners.topLeft.lon) * (1 - ny);
			const lonRight = gpsCorners.topRight.lon + (gpsCorners.bottomRight.lon - gpsCorners.topRight.lon) * (1 - ny);
			const lon = lonLeft + (lonRight - lonLeft) * nx;

			return [lat, lon];
		}

		ymaps.ready(init);

		function init() {
			const map = new ymaps.Map("map", {
				center: mapCenter,
				zoom: 17,
				controls: ['zoomControl']
			});

			// Загрузка данных из Google Apps Script
			fetch('https://script.google.com/macros/s/AKfycbxDTpFRcGUKWb10_dRcnIe99hmOw8DI3s7RsqfwEOLBx0wGnIZaI0P62B6WC6slLGeo-w/exec?callback=processData')
				.then(res => res.json())
				.then(data => {
					const polygons = [];
					const bounds = [];

					// Предполагаем, что у нас есть данные по участкам
					data.Участки.forEach(plot => {
						const plotData = plot; // Данные для каждого участка
						const status = plotData["Занятость участка"];

						// Выбираем цвет в зависимости от статуса
						let color;
						switch (status) {
							case "Продан":
								color = 'rgba(255, 0, 0, 0.6)'; // Красный
								break;
							case "Свободен":
								color = 'rgba(0, 255, 0, 0.6)'; // Зеленый
								break;
							case "Скоро в продаже":
								color = 'rgba(169, 169, 169, 0.6)'; // Серый
								break;
							case "Забронирован":
								color = 'rgba(255, 255, 0, 0.6)'; // Желтый
								break;
							default:
								color = 'rgba(0, 0, 255, 0.6)'; // Синий по умолчанию
						}

						// Преобразуем пиксельные точки в GPS
						const gpsPoints = plotData.points.map(([x, y]) => pxToGPS(x, y));

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

						// Сохраняем границы
						bounds.push(...gpsPoints);

						// Наведение
						polygon.events
							.add('mouseenter', () => polygon.options.set('fillColor', color.replace('0.6', '0.8')))
							.add('mouseleave', () => polygon.options.set('fillColor', color));

						// Клик — открытие модалки
						polygon.events.add('click', () => {
							openModal({
								id: plotData["№ участка"],
								area: plotData["Площадь участка"],
								status: plotData["Занятость участка"],
								points: gpsPoints
							});
						});

						map.geoObjects.add(polygon);
					});

					if (bounds.length) {
						map.setBounds(ymaps.util.bounds.fromPoints(bounds), { checkZoomRange: true });
					}
				});

			// Модалка
			window.openModal = (plot) => {
				const modal = document.getElementById('modal');
				modal.classList.add('active');
				document.getElementById('modal-title').textContent = `Участок ${plot.id}`;
				document.getElementById('modal-area').textContent = plot.area;
				document.getElementById('modal-id').textContent = plot.id;
				document.getElementById('modal-status').textContent = plot.status;
			};

			window.closeModal = () => {
				document.getElementById('modal').classList.remove('active');
			};
		}
