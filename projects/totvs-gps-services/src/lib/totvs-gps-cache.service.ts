import { Injectable } from '@angular/core';
import { isNullOrUndefined } from 'util';
import { ICacheService, ICacheModel } from './totvs-gps-cache.model';
import { ICacheList, ICacheValue } from './totvs-gps-cache.internal-model';

@Injectable()
export class TotvsGpsCacheService {

    private _services: ICacheService[] = [];
    private _list: ICacheList[] = [];

    public clearServices() {
        this._services = [];
        this._list = [];
    }
    
    public addService(model: ICacheModel, service: ICacheService) {
        this._services[model.ENTITY] = service;
    }

    public get(model: ICacheModel, callback?:Function): any {
        if (isNullOrUndefined(model)) {
            if (!isNullOrUndefined(callback))
                callback(null);
            return null;
        }
        let modelName = model.ENTITY;
        // Verifica se existe lista para o model, senao cria uma
        let cacheList = this._list[modelName];
        if (isNullOrUndefined(cacheList)) {
            this._list[modelName] = { values: [] };
            cacheList = this._list[modelName];
        }
        let pk = model.primaryKeys;
        let params = pk.map(item => String(model[item] || ''));
        let index = [modelName,...params].join(';');
        // se valor ja existe, usa o da lista
        let value: ICacheValue = (cacheList.values.find(item => item.index == index));
        if (!isNullOrUndefined(value)) {
            if (!isNullOrUndefined(callback)) {
                // se tiver função de callback, e a informação já está pronta, chama o callback
                if (value.ready)
                    callback(value.data);
                // senao, adiciona na lista para ser chamado posteriormente
                else
                    value.onReady.push((v:ICacheValue) => { callback(v.data) });
            }
            return value.data;
        }
        // se nao existe, pesquisa
        let service: ICacheService = this._services[modelName];
        if (isNullOrUndefined(service)) {
            if (!isNullOrUndefined(callback))
                callback(null);
            return null;
        }
        value = { index: index, data: new Object(), ready: false, onReady: [] };
        if (!isNullOrUndefined(callback))
            value.onReady.push((v:ICacheValue) => { callback(v.data) });
        cacheList.values.push(value);
        service.get(...params)
            .then(result => {
                Object.assign(value.data, result);
                this.callOnReady(value);
            });
        return value.data;
    }

    private callOnReady(value: ICacheValue) {
        value.ready = true;
        value.onReady.forEach(f => f(value));
        value.onReady = [];
    }

  
}
