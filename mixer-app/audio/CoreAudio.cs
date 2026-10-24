using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Runtime.InteropServices;

namespace MixerAudio {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class DeviceEnumerator {}
  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(int flow, uint mask, out IMMDeviceCollection devices);
    [PreserveSig] int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device);
    [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
    [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr client);
    [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr client);
  }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, uint context, IntPtr parameters, [MarshalAs(UnmanagedType.IUnknown)] out object instance);
    [PreserveSig] int OpenPropertyStore(uint access, out IPropertyStore properties);
    [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    [PreserveSig] int GetState(out uint state);
  }
  [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection {
    [PreserveSig] int GetCount(out uint count);
    [PreserveSig] int Item(uint index, out IMMDevice device);
  }
  [StructLayout(LayoutKind.Sequential)] struct PropertyKey { public Guid format; public uint id; }
  [StructLayout(LayoutKind.Explicit, Size=24)] struct PropertyValue { [FieldOffset(0)] public ushort type; [FieldOffset(8)] public IntPtr text; }
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore {
    [PreserveSig] int GetCount(out uint count);
    [PreserveSig] int GetAt(uint index, out PropertyKey key);
    [PreserveSig] int GetValue(ref PropertyKey key, out PropertyValue value);
    [PreserveSig] int SetValue(ref PropertyKey key, ref PropertyValue value);
    [PreserveSig] int Commit();
  }
  [ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 {
    [PreserveSig] int GetAudioSessionControl(ref Guid session, uint flags, out IntPtr control);
    [PreserveSig] int GetSimpleAudioVolume(ref Guid session, uint flags, out IntPtr volume);
    [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator sessions);
    [PreserveSig] int RegisterSessionNotification(IntPtr notification);
    [PreserveSig] int UnregisterSessionNotification(IntPtr notification);
    [PreserveSig] int RegisterDuckNotification([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr notification);
    [PreserveSig] int UnregisterDuckNotification(IntPtr notification);
  }
  [ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionEnumerator {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int GetSession(int index, [MarshalAs(UnmanagedType.IUnknown)] out object session);
  }
  [ComImport, Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl2 {
    [PreserveSig] int GetState(out int state);
    [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string name);
    [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string name, ref Guid context);
    [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string path);
    [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string path, ref Guid context);
    [PreserveSig] int GetGroupingParam(out Guid grouping);
    [PreserveSig] int SetGroupingParam(ref Guid grouping, ref Guid context);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr client);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr client);
    [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
    [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
    [PreserveSig] int GetProcessId(out uint pid);
    [PreserveSig] int IsSystemSoundsSession();
    [PreserveSig] int SetDuckingPreference([MarshalAs(UnmanagedType.Bool)] bool optOut);
  }
  [ComImport, Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISimpleAudioVolume {
    [PreserveSig] int SetMasterVolume(float volume, ref Guid context);
    [PreserveSig] int GetMasterVolume(out float volume);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
  }
  [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    [PreserveSig] int RegisterControlChangeNotify(IntPtr notify);
    [PreserveSig] int UnregisterControlChangeNotify(IntPtr notify);
    [PreserveSig] int GetChannelCount(out uint count);
    [PreserveSig] int SetMasterVolumeLevel(float level, ref Guid context);
    [PreserveSig] int SetMasterVolumeLevelScalar(float level, ref Guid context);
    [PreserveSig] int GetMasterVolumeLevel(out float level);
    [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
    [PreserveSig] int SetChannelVolumeLevel(uint channel, float level, ref Guid context);
    [PreserveSig] int SetChannelVolumeLevelScalar(uint channel, float level, ref Guid context);
    [PreserveSig] int GetChannelVolumeLevel(uint channel, out float level);
    [PreserveSig] int GetChannelVolumeLevelScalar(uint channel, out float level);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
    [PreserveSig] int GetVolumeStepInfo(out uint step, out uint count);
    [PreserveSig] int VolumeStepUp(ref Guid context);
    [PreserveSig] int VolumeStepDown(ref Guid context);
    [PreserveSig] int QueryHardwareSupport(out uint mask);
    [PreserveSig] int GetVolumeRange(out float min, out float max, out float increment);
  }
  public class SessionInfo { public string target; public string name; public string path; public string processName; public string kind; public float volume; }
  public static class Controller {
    static void Check(int hr) { Marshal.ThrowExceptionForHR(hr); }
    static void Release(object obj) { if (obj != null && Marshal.IsComObject(obj)) Marshal.ReleaseComObject(obj); }
    [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropertyValue value);
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder name, ref uint size);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    static string ProcessPath(uint pid) {
      // Query limited information; MainModule also requires access to process memory.
      IntPtr handle = OpenProcess(0x1000, false, pid);
      if (handle == IntPtr.Zero) return null;
      try { var name = new StringBuilder(32768); uint size = (uint)name.Capacity; return QueryFullProcessImageName(handle, 0, name, ref size) ? name.ToString() : null; }
      finally { CloseHandle(handle); }
    }
    public static bool MatchesTarget(string target, SessionInfo session) {
      if (String.Equals(target, session.target, StringComparison.OrdinalIgnoreCase)) return true;
      return target.StartsWith("@process:", StringComparison.OrdinalIgnoreCase) && String.Equals(target.Substring(9), session.processName, StringComparison.OrdinalIgnoreCase);
    }
    static IMMDevice DefaultDevice(int flow = 0) {
      IMMDeviceEnumerator e = (IMMDeviceEnumerator)new DeviceEnumerator();
      try { IMMDevice device; Check(e.GetDefaultAudioEndpoint(flow, 1, out device)); return device; }
      finally { Release(e); }
    }
    static object Activate(IMMDevice device, string id) { Guid guid = new Guid(id); object result; Check(device.Activate(ref guid, 23, IntPtr.Zero, out result)); return result; }
    static SessionInfo Describe(IAudioSessionControl2 session) {
      uint pid; Check(session.GetProcessId(out pid));
      float volume; Check(((ISimpleAudioVolume)session).GetMasterVolume(out volume));
      if (session.IsSystemSoundsSession() == 0) return new SessionInfo { target = "@system", name = "Sons do Windows", volume = volume };
      if (pid == 0) return null;
      try {
        using (Process process = Process.GetProcessById((int)pid)) {
          string file = ProcessPath(pid);
          string processName = process.ProcessName;
          return new SessionInfo { target = file ?? "@process:" + processName, path = file, processName = processName, name = processName, volume = volume };
        }
      } catch (System.ComponentModel.Win32Exception) { return null; }
      catch (InvalidOperationException) { return null; }
      catch (ArgumentException) { return null; }
    }
    static void Visit(IMMDevice device, Action<IAudioSessionControl2> action) {
      object manager = Activate(device, "77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
      IAudioSessionEnumerator sessions = null;
      try {
        Check(((IAudioSessionManager2)manager).GetSessionEnumerator(out sessions)); int count; Check(sessions.GetCount(out count));
        for (int i = 0; i < count; i++) {
          object raw; Check(sessions.GetSession(i, out raw));
          try { var session = (IAudioSessionControl2)raw; int state; Check(session.GetState(out state)); if (state != 2) action(session); }
          catch (COMException) { /* A session may disappear while the mixer is refreshing. */ }
          finally { Release(raw); }
        }
      } finally { Release(sessions); Release(manager); }
    }
    static void Devices(int flow, Action<IMMDevice> action) {
      var e = (IMMDeviceEnumerator)new DeviceEnumerator(); IMMDeviceCollection devices = null;
      try { Check(e.EnumAudioEndpoints(flow, 1, out devices)); uint count; Check(devices.GetCount(out count));
        for (uint i=0;i<count;i++) { IMMDevice d; Check(devices.Item(i,out d)); try { action(d); } finally { Release(d); } }
      } finally { Release(devices); Release(e); }
    }
    static float EndpointLevel(IMMDevice device, float? value = null) {
      object endpoint = Activate(device,"5CDF2C82-841E-4546-9722-0CF74078229A");
      try { var volume = (IAudioEndpointVolume)endpoint; if(value.HasValue) { Guid c = Guid.Empty; Check(volume.SetMasterVolumeLevelScalar(value.Value,ref c)); } float level; Check(volume.GetMasterVolumeLevelScalar(out level)); return level; }
      finally { Release(endpoint); }
    }
    public static SessionInfo[] Endpoints() {
      var result = new List<SessionInfo>();
      for(int flow=0;flow<2;flow++) { int current=flow; Devices(flow, delegate(IMMDevice d) {
        string id; Check(d.GetId(out id)); string name=id; IPropertyStore store=null;
        try { Check(d.OpenPropertyStore(0,out store)); var key=new PropertyKey{format=new Guid("A45C254E-DF1C-4EFD-8020-67D146A850E0"),id=14}; PropertyValue v; Check(store.GetValue(ref key,out v)); try { if(v.type==31)name=Marshal.PtrToStringUni(v.text); } finally { PropVariantClear(ref v); } }
        finally { Release(store); }
        result.Add(new SessionInfo{target="@device:"+id,name=name,kind=current==0?"output":"input",volume=EndpointLevel(d)});
      }); }
      return result.ToArray();
    }
    public static SessionInfo[] List() {
      IMMDevice device = DefaultDevice(); object endpoint = null;
      try {
        endpoint = Activate(device, "5CDF2C82-841E-4546-9722-0CF74078229A"); float volume; Check(((IAudioEndpointVolume)endpoint).GetMasterVolumeLevelScalar(out volume));
        var list = new List<SessionInfo>(); list.Add(new SessionInfo { target = "@master", name = "Volume geral", volume = volume });
        try { IMMDevice mic=DefaultDevice(1);try { list.Add(new SessionInfo{target="@microphone",name="Microfone",volume=EndpointLevel(mic)}); } finally { Release(mic); } } catch(COMException) { }
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        Devices(0, delegate(IMMDevice d) { Visit(d, delegate(IAudioSessionControl2 session) { var info = Describe(session); if (info != null && seen.Add(info.target)) list.Add(info); }); });
        return list.ToArray();
      } finally { Release(endpoint); Release(device); }
    }
    public static int Set(string[] targets, float volume) {
      if (float.IsNaN(volume) || volume < 0 || volume > 1) throw new ArgumentOutOfRangeException("volume");
      var chosen = new HashSet<string>(targets, StringComparer.OrdinalIgnoreCase); int matched = 0;
      IMMDevice device = DefaultDevice(); object endpoint = null; Guid context = Guid.Empty;
      try {
        if (chosen.Contains("@master")) { endpoint = Activate(device, "5CDF2C82-841E-4546-9722-0CF74078229A"); Check(((IAudioEndpointVolume)endpoint).SetMasterVolumeLevelScalar(volume, ref context)); matched++; }
        if(chosen.Contains("@microphone")) { IMMDevice mic=DefaultDevice(1); try { EndpointLevel(mic,volume); matched++; } finally { Release(mic); } }
        var enumerator=(IMMDeviceEnumerator)new DeviceEnumerator();
        try { foreach(string target in targets) if(target.StartsWith("@device:")) { IMMDevice d; Check(enumerator.GetDevice(target.Substring(8),out d)); try { EndpointLevel(d,volume); matched++; } finally { Release(d); } } }
        finally { Release(enumerator); }
        Devices(0, delegate(IMMDevice d) { Visit(d, delegate(IAudioSessionControl2 session) { var info = Describe(session); if (info != null && Array.Exists(targets, target => MatchesTarget(target, info))) { Guid c = Guid.Empty; Check(((ISimpleAudioVolume)session).SetMasterVolume(volume, ref c)); matched++; } }); });
        return matched;
      } finally { Release(endpoint); Release(device); }
    }
  }
}
