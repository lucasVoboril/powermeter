module.exports = function dispositivosController(dispositivosService) {
  return {
    report,
    toList,
    actualizar,
    borrar
  };

  async function actualizar(req, res) {
    await dispositivosService.actualizar(req.params.dispoId, req.body.name);
    res.status(200).send();
  }

  async function borrar(req, res) {
    await dispositivosService.borrar(req.params.dispoId);
    res.status(200).send();
  }

  async function report(req, res) {
    await dispositivosService.report(req.params.dispoId, req.body);
    res.status(200).send();
  }

  async function toList(req, res) {
    const dispositivos = await dispositivosService.list();
    if (req.query.format === 'json') {
      res.json(dispositivos);
    } else {
      res.render('dispositivos', { dispositivos });
    }
  }
};
