// Leitor/escritor mínimo de VPK v2 (formato de pacote do Source 2).
// Usado pelo build do mod: lê arquivos do jogo (pak01_dir.vpk) e empacota o addon.
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public class VpkEntry
{
    public string Path;
    public uint Crc;
    public ushort ArchiveIndex;
    public uint Offset;
    public uint Length;
    public byte[] Preload;
}

public static class Vpk
{
    const uint Signature = 0x55AA1234;

    static string ReadCString(BinaryReader r)
    {
        var bytes = new List<byte>();
        byte b;
        while ((b = r.ReadByte()) != 0) bytes.Add(b);
        return Encoding.UTF8.GetString(bytes.ToArray());
    }

    public static List<VpkEntry> ReadDir(string dirPath, out uint treeEnd)
    {
        var list = new List<VpkEntry>();
        using (var r = new BinaryReader(File.OpenRead(dirPath)))
        {
            if (r.ReadUInt32() != Signature) throw new Exception("Não é um VPK");
            uint version = r.ReadUInt32();
            uint treeSize = r.ReadUInt32();
            if (version == 2) r.ReadBytes(16);
            uint headerSize = version == 2 ? 28u : 12u;
            treeEnd = headerSize + treeSize;
            while (true)
            {
                string ext = ReadCString(r);
                if (ext == "") break;
                while (true)
                {
                    string dir = ReadCString(r);
                    if (dir == "") break;
                    while (true)
                    {
                        string name = ReadCString(r);
                        if (name == "") break;
                        var e = new VpkEntry();
                        e.Crc = r.ReadUInt32();
                        ushort preload = r.ReadUInt16();
                        e.ArchiveIndex = r.ReadUInt16();
                        e.Offset = r.ReadUInt32();
                        e.Length = r.ReadUInt32();
                        r.ReadUInt16(); // terminador 0xFFFF
                        e.Preload = r.ReadBytes(preload);
                        string d = dir == " " ? "" : dir + "/";
                        string n = ext == " " ? name : name + "." + ext;
                        e.Path = d + n;
                        list.Add(e);
                    }
                }
            }
        }
        return list;
    }

    public static byte[] Extract(string dirPath, VpkEntry e, uint treeEnd)
    {
        var data = new byte[e.Preload.Length + e.Length];
        Buffer.BlockCopy(e.Preload, 0, data, 0, e.Preload.Length);
        if (e.Length == 0) return data;
        string archive;
        long offset = e.Offset;
        if (e.ArchiveIndex == 0x7FFF)
        {
            archive = dirPath;
            offset += treeEnd;
        }
        else
        {
            archive = dirPath.Replace("_dir.vpk", "_" + e.ArchiveIndex.ToString("000") + ".vpk");
        }
        using (var f = File.OpenRead(archive))
        {
            f.Seek(offset, SeekOrigin.Begin);
            int read = 0;
            while (read < e.Length)
            {
                int n = f.Read(data, e.Preload.Length + read, (int)e.Length - read);
                if (n <= 0) throw new Exception("Fim inesperado em " + archive);
                read += n;
            }
        }
        return data;
    }

    // Empacota todos os arquivos de 'root' num VPK v2 de arquivo único (dados dentro do _dir).
    public static void Pack(string root, string outPath)
    {
        root = System.IO.Path.GetFullPath(root).TrimEnd('\\', '/');
        var files = new List<string>(Directory.GetFiles(root, "*", SearchOption.AllDirectories));
        // ext -> dir -> lista de arquivos
        var tree = new SortedDictionary<string, SortedDictionary<string, List<string>>>(StringComparer.Ordinal);
        foreach (var full in files)
        {
            string rel = full.Substring(root.Length + 1).Replace('\\', '/');
            string ext = System.IO.Path.GetExtension(rel).TrimStart('.');
            string dir = System.IO.Path.GetDirectoryName(rel).Replace('\\', '/');
            if (ext == "") ext = " ";
            if (dir == "") dir = " ";
            if (!tree.ContainsKey(ext)) tree[ext] = new SortedDictionary<string, List<string>>(StringComparer.Ordinal);
            if (!tree[ext].ContainsKey(dir)) tree[ext][dir] = new List<string>();
            tree[ext][dir].Add(full);
        }

        var treeMs = new MemoryStream();
        var dataMs = new MemoryStream();
        var tw = new BinaryWriter(treeMs);
        Action<string> cstr = s => { var b = Encoding.UTF8.GetBytes(s); tw.Write(b); tw.Write((byte)0); };
        foreach (var ext in tree)
        {
            cstr(ext.Key);
            foreach (var dir in ext.Value)
            {
                cstr(dir.Key);
                foreach (var full in dir.Value)
                {
                    cstr(System.IO.Path.GetFileNameWithoutExtension(full));
                    byte[] content = File.ReadAllBytes(full);
                    tw.Write(Crc32(content));
                    tw.Write((ushort)0);          // preload
                    tw.Write((ushort)0x7FFF);     // dados no próprio _dir
                    tw.Write((uint)dataMs.Position);
                    tw.Write((uint)content.Length);
                    tw.Write((ushort)0xFFFF);
                    dataMs.Write(content, 0, content.Length);
                }
                cstr("");
            }
            cstr("");
        }
        cstr("");

        using (var w = new BinaryWriter(File.Create(outPath)))
        {
            w.Write(Signature);
            w.Write(2u);
            w.Write((uint)treeMs.Length);
            w.Write((uint)dataMs.Length);
            w.Write(0u); w.Write(0u); w.Write(0u);
            w.Write(treeMs.ToArray());
            w.Write(dataMs.ToArray());
        }
    }

    static uint[] crcTable;
    public static uint Crc32(byte[] data)
    {
        if (crcTable == null)
        {
            crcTable = new uint[256];
            for (uint i = 0; i < 256; i++)
            {
                uint c = i;
                for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320 ^ (c >> 1) : c >> 1;
                crcTable[i] = c;
            }
        }
        uint crc = 0xFFFFFFFF;
        foreach (byte b in data) crc = crcTable[(crc ^ b) & 0xFF] ^ (crc >> 8);
        return crc ^ 0xFFFFFFFF;
    }
}
