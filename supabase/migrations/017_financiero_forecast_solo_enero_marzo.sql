-- Depura el forecast historico importado en 013: a pedido de Ariel, solo se
-- mantiene el forecast de enero y marzo 2026; el resto (abril-diciembre) se elimina.
delete from financiero_forecast_presupuesto
where mes not in (1, 3);
