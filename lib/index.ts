import fetch from "node-fetch"

const API_TOKEN = process.env.API_TOKEN


interface ISeatable {
    token: string
}


interface IAuth {
    access_token: string
}

export interface Checklist {
    total: number;
    completed: number;
}


export interface Row {
    _id: string;
    _participants: any[];
    _creator: string;
    _ctime: Date;
    _last_modifier: string;
    _mtime: Date;
}

export interface Option {
    name: string;
    color: string;
    textColor: string;
    id: string;
}

export interface Data {
    enable_fill_default_value: boolean;
    default_value: any;
    format: string;
    default_date_type: string;
    options: Option[];
}

export interface Editor {
    key?: any;
    ref?: any;
    props: any;
    _owner?: any;
}

export interface Formatter {
    key?: any;
    ref?: any;
    _owner?: any;
}

export interface Column {
    key: string;
    name: string;
    type: string;
    width: number;
    editable: boolean;
    resizable: boolean;
    draggable?: boolean;
    data: Data;
    permission_type: string;
    permitted_users: any[];
    description?: any;
    editor: Editor;
    formatter: Formatter;
}

export interface FormulaRows {
}

export interface View {
    _id: string;
    name: string;
    type: string;
    is_locked: boolean;
    rows: any[];
    formula_rows: FormulaRows;
    summaries: any[];
    filter_conjunction: string;
    filters: any[];
    sorts: any[];
    hidden_columns: any[];
    groupbys: any[];
    groups: any[];
}

export interface IdRowMap {
}

export interface Tags {
    name: string;
    color: string;
    textColor: string;
    id: string;
}

export interface Text {
    text: string;
    preview: string;
    links: string[];
    images: any[];
    checklist: Checklist;
}


export interface Teaser {
    text: string;
    preview: string;
    images: any[];
    links: any[];
    checklist: Checklist;
}


export interface SeatableTable {
    _id: string;
    name: string;
    rows: Row[];
    columns: Column[];
    views: View[];
    id_row_map: IdRowMap;
    optionById: IHash<any>;
    optionNameById: IHash<any>;
    data: any;
}


const toDictionary = (data: any, keyName = "key") => Object.assign({}, ...data.map((x: IHash<any>) => ({ [x[keyName]]: x })));
const parseColumn = (col: any, value: any, { optionNameById }: { optionNameById: IHash<any> }) => {
    if (!col) return null
    const { name, type, ...rest } = col

    let out
    switch (type) {
        case "single-select":
            out = optionNameById[`${col.name}.${value}`]
            break;
        case "multiple-select":
            out = value.map((tag: any) => optionNameById[`${col.name}.${tag}`])
            break;
        default:
            out = value;
            break;
    }
    return out
}


function processTable(table: any) {
    const optionById: IHash<any> = {}
    const optionNameById: IHash<any> = {}
    const columnById = toDictionary(table.columns)
    // CREATE COLUMN OPTION META DATA
    table.columns.forEach((column: any) => {
        let col = columnById[column.key]
        if (column.data && column.data.options && column.data.options.length > 0) {
            column.data.options.forEach((option: any) => {
                optionById[`${col.name}.${option.id}`] = option
                optionNameById[`${col.name}.${option.id}`] = option.name
            })
        }
    })
    table.optionById = optionById
    table.optionNameById = optionNameById
    table.data = table.rows.map((row: any) => {
        // 0000 is always the default key. It is not in the table, it's not data :)
        if (!row["0000"]) {
            return
        }
        let out: IHash<any> = {
            id: row._id
        }
        Object.entries(row)
            .forEach(([key, value]) => {
                let col = columnById[key]
                if (!col) return null
                out[col.name] = parseColumn(col, value, { optionNameById })
            })

        return out
    })
        .filter(row => row)
    return table
}

export class Seatable {
    token: string
    base?: Base
    auth?: IAuth

    constructor(config: ISeatable) {
        this.token = config.token
        if (!this.token) throw new Error("Seatable: no token received")
    }


    async  getAuth() {
        const data = await fetch("https://cloud.seatable.io/api/v2.1/dtable/app-access-token/", {
            method: "GET",
            headers: {
                "Accept": "application/json; charset=utf-8; indent=4",
                "Authorization": `Token ${this.token}`,
            },
            redirect: "follow"
        })
            .then(res => res.json())
        return data
    }

    async  getTable(tableName: any, baseId = "") {
        if (!this.base) {
            this.base = await this.getBase(baseId)
        }
        let table = this.base.tableByName[tableName] || this.base.tableById[tableName]
        return table?.data
    }


    async  getBase(id: string, lang = "en"): Promise<Base> {
        this.auth = this.auth || await this.getAuth()
        if (!this.auth) throw Error("No valid Auth - aborting Base/Table fetch")
        const { access_token } = this.auth

        const data = await fetch(`https://cloud.seatable.io/dtable-server/dtables/${id}?lang=${lang}`, {
            method: "GET",
            headers: {
                "Accept": "application/json; charset=utf-8; indent=4",
                "Authorization": `Token ${access_token}`,
            },
            redirect: "follow"
        })
            .then(res => res.json())
        this.base = new Base(data)
        return this.base
    }
}


interface IHash<T> {
    [hash: string]: T
}

interface IHashTableTable {
    [tableId: string]: SeatableTable
}

export class Base {
    tableById: IHashTableTable = {}
    tableByName: IHashTableTable = {}
    tables: SeatableTable[] = []

    constructor(data: any) {
        if (!data.tables) {
            throw new Error(data)
        }
        data.tables.forEach((table: any) => {
            table = processTable(table)
            this.tableById[table._id] = table
            this.tableByName[table.name] = table
        })
    }
}




