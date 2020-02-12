const Afip = require('@afipsdk/afip.js');

const afip = new Afip({ CUIT: 20376203698 });

exports.getVoucher = async (req, res, next) => {
    const ticketNumber = req.query.ticketNumber;
    try {
        const voucherInfo = await afip.ElectronicBilling.getVoucherInfo(ticketNumber, 1, 6); //Devuelve la información del comprobante 1 para el punto de venta 1 y el tipo de comprobante 6 (Factura B)

        if (voucherInfo === null) {
            const error = new Error('Could not find any voucher');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            voucherInfo,
            voucherTypes
        });
    } catch (err) {
        if (err.message === '(602) No existen datos en nuestros registros para los parametros ingresados.') {
            err.statusCode = 404;
            err.message = 'No voucher found.';
        }
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.getLastVoucher = async (req, res, next) => {
    const salePoint = req.query.salePoint;
    const ticketType = req.query.ticketType;
    try {
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(salePoint, ticketType); //Devuelve el número del último comprobante creado para el punto de venta 1 y el tipo de comprobante 6 (Factura B)
        if (lastVoucher === null) {
            const error = new Error('Could not find any voucher');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            lastVoucher,
        });
    } catch (err) {
        if (err.message === '(602) No existen datos en nuestros registros para los parametros ingresados.') {
            err.statusCode = 404;
            err.message = 'No voucher found.';
        }
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getVoucherTypes = async (req, res, next) => {
    try {
        const voucherTypes = await afip.ElectronicBilling.getVoucherTypes();
        res.status(200).json({
            voucherTypes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.getIdTypes = async (req, res, next) => {
    try {
        const idTypes = await afip.ElectronicBilling.getDocumentTypes();
        res.status(200).json({
            idTypes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getAloquotTypes = async (req, res, next) => {
    try {
        const aloquotTypes = await afip.ElectronicBilling.getAliquotTypes();
        res.status(200).json({
            aloquotTypes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getCurrencyTypes = async (req, res, next) => {
    try {
        const currencyTypes = await afip.ElectronicBilling.getCurrenciesTypes();
        res.status(200).json({
            currencyTypes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.getTaxTypes = async (req, res, next) => {
    try {
        const taxTypes = await afip.ElectronicBilling.getTaxTypes();
        res.status(200).json({
            taxTypes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getServerStatus = async (req, res, next) => {
    try {
        const serverStatus = await afip.ElectronicBilling.getServerStatus();
        res.status(200).json({
            serverStatus
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addVoucher = async (req, res, next) => {
    const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const total = req.body.total;
    let data2 = {
        'CantReg': 1,  // Cantidad de comprobantes a registrar
        'PtoVta': req.body.PtoVta,  // Punto de venta
        'CbteTipo': (req.body.CbteTipo),  // Tipo de comprobante (ver tipos disponibles) 
        'Concepto': (req.body.Concepto),  // Concepto del Comprobante: (1)Productos, (2)Servicios, (3)Productos y Servicios
        'DocTipo': (req.body.DocTipo), // Tipo de documento del comprador (99 consumidor final, ver tipos disponibles)
        'DocNro': parseInt(req.body.DocNro),  // Número de documento del comprador (0 consumidor final)
        'CbteDesde': parseInt(req.body.CbteDesde) + 1,  // Número de comprobante o numero del primer comprobante en caso de ser mas de uno
        'CbteHasta': parseInt(req.body.CbteHasta) + 1,  // Número de comprobante o numero del último comprobante en caso de ser mas de uno
        'CbteFch': parseInt(date.replace(/-/g, '')), // (Opcional) Fecha del comprobante (yyyymmdd) o fecha actual si es nulo
        'ImpTotal': parseFloat((total).toFixedNoRounding(2)), // Importe total del comprobante
        'ImpTotConc': (req.body.ImpTotConc),   // Importe neto no gravado
        'ImpNeto': parseFloat((total / 121 * 100).toFixedNoRounding(2)), // Importe neto gravado
        'ImpOpEx': (req.body.ImpOpEx),   // Importe exento de IVA
        'ImpIVA': parseFloat((total / 121 * 21).toFixedNoRounding(2)),  //Importe total de IVA
        'ImpTrib': (req.body.ImpTrib),   //Importe total de tributos
        'MonId': req.body.MonId, //Tipo de moneda usada en el comprobante (ver tipos disponibles)('PES' para pesos argentinos) 
        'MonCotiz': (req.body.MonCotiz), // Cotización de la moneda usada (1 para pesos argentinos) 
        'Iva': [ // (Opcional) Alícuotas asociadas al comprobante
            {
                'Id': 5, // Id del tipo de IVA (5 para 21%)(ver tipos disponibles) 
                'BaseImp': parseFloat((total / 121 * 100).toFixedNoRounding(2)), // Base imponible
                'Importe': parseFloat((total / 121 * 21).toFixedNoRounding(2)) // Importe 
            }
        ],
    };
    if (data2.CbteTipo === 1 && data2.DocTipo !== 80 || data2.CbteTipo === 2 && data2.DocTipo !== 80 || data2.CbteTipo === 3 && data2.DocTipo !== 80) {
        const error = new Error('id type should be 80 with Tickets type A or C');
        error.statusCode = 601;
        next(error);
    }
    try {
        const response = await afip.ElectronicBilling.createVoucher(data2);
        res.status(200).json({
            message: 'Voucher Created',
            response,
            data2
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

Number.prototype.toFixedNoRounding = function (n) {
    const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g");
    const a = this.toString().match(reg)[0];
    const dot = a.indexOf(".");
    if (dot === -1) { // integer, insert decimal dot and pad up zeros
        return a + "." + "0".repeat(n);
    }
    const b = n - (a.length - dot) + 1;
    return b > 0 ? (a + "0".repeat(b)) : a;
};