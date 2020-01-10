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
    try {
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(1, 6); //Devuelve el número del último comprobante creado para el punto de venta 1 y el tipo de comprobante 6 (Factura B)
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

    // let data = {
    //     'CantReg': 1,  // Cantidad de comprobantes a registrar
    //     'PtoVta': req.body.salePoint,  // Punto de venta
    //     'CbteTipo': req.body.ticketType,  // Tipo de comprobante (ver tipos disponibles) 
    //     'Concepto': req.body.concept,  // Concepto del Comprobante: (1)Productos, (2)Servicios, (3)Productos y Servicios
    //     'DocTipo': req.body.idType, // Tipo de documento del comprador (99 consumidor final, ver tipos disponibles)
    //     'DocNro': req.body.idNumber,  // Número de documento del comprador (0 consumidor final)
    //     'CbteDesde': 1,  // Número de comprobante o numero del primer comprobante en caso de ser mas de uno
    //     'CbteHasta': 1,  // Número de comprobante o numero del último comprobante en caso de ser mas de uno
    //     'CbteFch': parseInt(date.replace(/-/g, '')), // (Opcional) Fecha del comprobante (yyyymmdd) o fecha actual si es nulo
    //     'ImpTotal': req.body.total, // Importe total del comprobante
    //     'ImpTotConc': req.body.salePoint.noNetoAmount,   // Importe neto no gravado
    //     'ImpNeto': req.body.netoAmount, // Importe neto gravado
    //     'ImpOpEx': req.body.noIvaAmount,   // Importe exento de IVA
    //     'ImpIVA': req.body.iva,  //Importe total de IVA
    //     'ImpTrib': req.body.tributeAmount,   //Importe total de tributos
    //     'MonId': req.body.currency, //Tipo de moneda usada en el comprobante (ver tipos disponibles)('PES' para pesos argentinos) 
    //     'MonCotiz': req.body.currencyExchange,     // Cotización de la moneda usada (1 para pesos argentinos)  
    //     'Iva': [ // (Opcional) Alícuotas asociadas al comprobante
    //         {
    //             'Id': req.body.ivaType, // Id del tipo de IVA (5 para 21%)(ver tipos disponibles) 
    //             'BaseImp': req.body.netoAmount, // Base imponible
    //             'Importe': req.body.iva // Importe 
    //         }
    //     ],
    // };
    let data = {
        'CantReg': 1,  // Cantidad de comprobantes a registrar
        'PtoVta': 1,  // Punto de venta
        'CbteTipo': 6,  // Tipo de comprobante (ver tipos disponibles) 
        'Concepto': 1,  // Concepto del Comprobante: (1)Productos, (2)Servicios, (3)Productos y Servicios
        'DocTipo': 99, // Tipo de documento del comprador (99 consumidor final, ver tipos disponibles)
        'DocNro': 0,  // Número de documento del comprador (0 consumidor final)
        'CbteDesde': 1,  // Número de comprobante o numero del primer comprobante en caso de ser mas de uno
        'CbteHasta': 1,  // Número de comprobante o numero del último comprobante en caso de ser mas de uno
        'CbteFch': parseInt(date.replace(/-/g, '')), // (Opcional) Fecha del comprobante (yyyymmdd) o fecha actual si es nulo
        'ImpTotal': 121, // Importe total del comprobante
        'ImpTotConc': 0,   // Importe neto no gravado
        'ImpNeto': 100, // Importe neto gravado
        'ImpOpEx': 0,   // Importe exento de IVA
        'ImpIVA': 21,  //Importe total de IVA
        'ImpTrib': 0,   //Importe total de tributos
        'MonId': 'PES', //Tipo de moneda usada en el comprobante (ver tipos disponibles)('PES' para pesos argentinos) 
        'MonCotiz': 1,     // Cotización de la moneda usada (1 para pesos argentinos)  
        'Iva': [ // (Opcional) Alícuotas asociadas al comprobante
            {
                'Id': 5, // Id del tipo de IVA (5 para 21%)(ver tipos disponibles) 
                'BaseImp': 100, // Base imponible
                'Importe': 21 // Importe 
            }
        ],
    };
    try {
        const response = await afip.ElectronicBilling.createNextVoucher(data);
        res.status(200).json({
            message: 'Voucher Created',
            response
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
